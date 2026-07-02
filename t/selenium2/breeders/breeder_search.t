use strict;

use lib 't/lib';

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::WWW::Mechanize;
use Selenium::Firefox::Profile;
use Selenium::Remote::WDKeys 'KEYS';
use SGN::Model::Cvterm;
use SGN::Test::Fixture;
use JSON;
use File::Slurp qw(read_file);
use Data::Dumper;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $mech = SGN::Test::WWW::Mechanize->new;

# Setup Firefox profile for automatic downloads
# The path /downloads on the selenium host is shared with the host and typically
# mapped to /selenium/downloads on the breedbase (web) host.
my $profile = Selenium::Firefox::Profile->new;
$profile->set_preference( 'browser.download.folderList', 2 );
$profile->set_preference( 'browser.download.dir', '/downloads' );
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/text' );

my $driver = Selenium::Remote::Driver->new(
    firefox_profile => $profile,
    base_url => $ENV{SGN_TEST_SERVER},
    remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost'
);
$t->driver($driver);

# get the database schema for test data setup
my $schema = $f->bcs_schema;

# -----------------------------------------------------------------------------
# Create Tissue Samples for Searching Genotyping Data

my $test_accession1_id = $schema->resultset("Stock::Stock")->find({uniquename=>'test_accession1'})->stock_id();

my $tissue_sample_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_sample', 'stock_type')->cvterm_id();
my $tissue_type_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_type', 'stock_property')->cvterm_id();
my $tissue_sample_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_sample_of', 'stock_relationship')->cvterm_id();
my $organism = $schema->resultset("Organism::Organism")->first();
my $num_tissue_samples = 3;

my $location_rs = $schema->resultset('NaturalDiversity::NdGeolocation')->search({description => 'Cornell Biotech'});
my $location_id = $location_rs->first->nd_geolocation_id;

my $bp_rs = $schema->resultset('Project::Project')->search({name => 'test'});
my $breeding_program_id = $bp_rs->first->project_id;

my @tissue_samples;

foreach my $i (1 .. $num_tissue_samples) {
    # Create tissue sample stocks
    my $tissue_sample_name = "test_accession1_leaf-${i}";
    my $tissue_sample = $schema->resultset("Stock::Stock")->find_or_create({
        uniquename => $tissue_sample_name,
        name => $tissue_sample_name,
        type_id => $tissue_sample_cvterm_id,
        organism_id => $organism->organism_id,
    });
    # Create tissue sample stock properties
    $schema->resultset("Stock::Stockprop")->find_or_create( {
        stock_id => $tissue_sample->stock_id(),
        type_id => $tissue_type_cvterm_id,
        value => "leaf",
    });
    # Create tissue sample stock relationships
    $schema->resultset("Stock::StockRelationship")->find_or_create({
        subject_id => $tissue_sample->stock_id(),
        object_id => $test_accession1_id,
        type_id => $tissue_sample_of_cvterm_id,
    });
    push(@tissue_samples, $tissue_sample_name);
}

# -----------------------------------------------------------------------------
# Create VCF File for Genotyping Data

my $upload_tissue_sample_genotypes = '##INFO=<ID=VCFDownload, Description=\'VCF file for testing uploading genotypes using tissue samples\'>
##fileformat=VCFv4.0
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
##FORMAT=<ID=AD,Number=.,Type=Integer,Description="Allelic depths for the reference and alternate alleles in the order listed">
##FORMAT=<ID=DP,Number=1,Type=Integer,Description="Read Depth (only filtered reads used for calling)">
##FORMAT=<ID=GQ,Number=1,Type=Float,Description="Genotype Quality">
##FORMAT=<ID=PL,Number=3,Type=Float,Description="Normalized, Phred-scaled likelihoods for AA,AB,BB genotypes where A=ref and B=alt; not applicable if site is not biallelic">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	test_accession1_leaf-1	test_accession1_leaf-2	test_accession1_leaf-3
1 	10 	S1_10	G	A	.	PASS	.	GT:AD:DP:GQ:PL	./.:0,0:0:.:1	0/0:10,10:20:99:0,255,255	1/1:10,10:20:99:0,255,255
';

my $upload_tissue_sample_genotypes_path = "/tmp/upload_tissue_sample_genotypes.vcf";
open(my $fh_vcf, '>', $upload_tissue_sample_genotypes_path) or die $!;
print $fh_vcf $upload_tissue_sample_genotypes;
close($fh_vcf);

# -----------------------------------------------------------------------------
# Upload VCF File of tissue samples

# Get a sgn_session_id for creating a genotyping protocol and project
my $submitter = $t->user_data->{submitter};
$mech->post_ok('http://localhost:3010/brapi/v1/token', [ "username" => $submitter->{username}, "password" =>  $submitter->{password}, "grant_type" => "password" ]);
my $response = decode_json $mech->content;
is($response->{'metadata'}->{'status'}->[2]->{'message'}, 'Login Successfull');
my $sgn_session_id = $response->{access_token};

# this upload simultaneous creates a genotyping project and a genotyping protocol
my $ua = LWP::UserAgent->new;
my $response = $ua->post(
    'http://localhost:3010/ajax/genotype/upload',
    Content_Type => 'form-data',
    Content => [
        upload_genotype_vcf_file_input => [ $upload_tissue_sample_genotypes_path, 'genotype_vcf_data_upload' ],
        "sgn_session_id"=>$sgn_session_id,
        "upload_genotypes_species_name_input"=>$organism->species(),
        "upload_genotype_vcf_project_name"=>"Tissue Sample Genotype Test",
        "upload_genotype_location_select"=>$location_id,
        "upload_genotype_year_select"=>"2026",
        "upload_genotype_breeding_program_select"=>$breeding_program_id,
        "upload_genotype_vcf_observation_type"=>"tissue_sample", #IDEALLY THIS IS "tissue_sample"
        "upload_genotype_vcf_facility_select"=>"IGD",
        "upload_genotype_vcf_project_description"=>"Test uploading genotypes to tissue samples",
        "upload_genotype_vcf_protocol_name"=>"Test Genotyping Protocol for Tissue Samples",
        "upload_genotype_vcf_include_igd_numbers"=>0,
        "upload_genotype_vcf_reference_genome_name"=>"Test_Reference_v1",
        "upload_genotype_add_new_accessions"=>0,
    ]
);

# Check response
ok($response->is_success);
my $message = $response->decoded_content;
my $message_hash = decode_json $message;
is($message_hash->{success}, 1);

my $tissue_sample_protocol_id = $message_hash->{nd_protocol_id};

$t->while_logged_in_as("submitter", sub {
    $t->get_ok('/breeders/search');

    sleep(1); # FIXME Need to wait for click handler to be registered

    # -----------------------------------------------------------------------------
    # Download VCF File based on accession list

    # select genotyping protocols
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="genotyping_protocols"]', 'xpath', 'select genotyping_protocols');
    $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "Test Genotyping Protocol for Tissue Samples")]//preceding-sibling::button' , 'xpath', 'select Test Genotyping Protocol for Tissue Samples protocol');
    # select accessions
    $t->click_ok('(//div[@class="panel-heading"]/select)[2]//option[@value="accessions"]', 'xpath', 'select accessions');
    $t->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "test_accession1")]//preceding-sibling::button' , 'xpath', 'select test_accession1 accession');
    # open download genotype data
    $t->click_ok('//span[text()="Related Genotype Data"]', 'xpath', 'open related genotype data panel');
    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('wizard-download-genotypes', 'class', 'download genotypes');

    # search for a vcf file that is newer than before we clicked download
    my $vcf_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/breedbase_genotypes_*.vcf",
        $download_time,
        10 ,# maximum find attempts
    );
    ok(defined($vcf_file_path), "locate downloaded vcf file");

    my $vcf_response_string_expected = "##INFO=<ID=VCFDownload, Description=\'VCF file for testing uploading genotypes using tissue samples\'>
    ##fileformat=VCFv4.0
    ##FORMAT=<ID=GT,Number=1,Type=String,Description=\"Genotype\">
    ##FORMAT=<ID=AD,Number=.,Type=Integer,Description=\"Allelic depths for the reference and alternate alleles in the order listed\">
    ##FORMAT=<ID=DP,Number=1,Type=Integer,Description=\"Read Depth (only filtered reads used for calling)\">
    ##FORMAT=<ID=GQ,Number=1,Type=Float,Description=\"Genotype Quality\">
    ##FORMAT=<ID=PL,Number=3,Type=Float,Description=\"Normalized, Phred-scaled likelihoods for AA,AB,BB genotypes where A=ref and B=alt; not applicable if site is not biallelic\">
    ##source=FILE GENERATED BY BREEDBASE
    ##Genotyping protocol id(s)=$tissue_sample_protocol_id
    ##Genotyping protocol name(s)=Test Genotyping Protocol for Tissue Samples
    ##SynonymsOfAccessions=\" test_accession1=(test_accession1_synonym1)\"
    #CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	test_accession1_leaf-1	test_accession1_leaf-2	test_accession1_leaf-3
    1	10	S1_10	G	A	.	PASS	.	GT:AD:DP:GQ:PL:NT:DS	./.:0,0:0:.:1::NA	0/0:10,10:20:99:0,255,255:G,G:0	1/1:10,10:20:99:0,255,255:A,A:2
    ";
    # Remove leading spaces and tabs
    $vcf_response_string_expected =~ s/^[ ]+//mg;
    my @vcf_response_observed = read_file($vcf_file_path, chomp => 1);
    my @vcf_response_expected = split "\n", $vcf_response_string_expected;
    # remove lines with metadata about file date
    @vcf_response_observed = grep !/fileDate/, @vcf_response_observed;
    is_deeply(\@vcf_response_observed, \@vcf_response_expected);

    unlink($vcf_file_path) or die "Failed to delete $vcf_file_path: $!";

    # -----------------------------------------------------------------------------
    # Download VCF File based on tissue sample list

    $t->get_ok('/breeders/search');

    sleep(1); # FIXME Need to wait for click handler to be registered

    # select genotyping protocols
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="genotyping_protocols"]', 'xpath', 'select genotyping_protocols');
    $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "Test Genotyping Protocol for Tissue Samples")]//preceding-sibling::button' , 'xpath', 'select Test Genotyping Protocol for Tissue Samples protocol');
    # select tissue samples
    $t->click_ok('(//div[@class="panel-heading"]/select)[2]//option[@value="tissue_sample"]', 'xpath', 'select tissue samples');
    $t->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "test_accession1_leaf-1")]//preceding-sibling::button' , 'xpath', 'select test_accession1_leaf-1 tissue sample');
    $t->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "test_accession1_leaf-3")]//preceding-sibling::button' , 'xpath', 'select test_accession1_leaf-3 tissue sample');
    # open download genotype data
    $t->click_ok('//span[text()="Related Genotype Data"]', 'xpath', 'open related genotype data panel');
    # save the current time, we will need this to find the correct downloaded file
    $download_time = time();
    $t->click_ok('wizard-download-genotypes', 'class', 'download genotypes');

    # search for a vcf file that is newer than before we clicked download
    my $vcf_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/breedbase_genotypes_*.vcf",
        $download_time,
        10 ,# maximum find attempts
    );
    ok(defined($vcf_file_path), "locate downloaded vcf file");

    my $vcf_response_string_expected = "##INFO=<ID=VCFDownload, Description=\'VCF file for testing uploading genotypes using tissue samples\'>
    ##fileformat=VCFv4.0
    ##FORMAT=<ID=GT,Number=1,Type=String,Description=\"Genotype\">
    ##FORMAT=<ID=AD,Number=.,Type=Integer,Description=\"Allelic depths for the reference and alternate alleles in the order listed\">
    ##FORMAT=<ID=DP,Number=1,Type=Integer,Description=\"Read Depth (only filtered reads used for calling)\">
    ##FORMAT=<ID=GQ,Number=1,Type=Float,Description=\"Genotype Quality\">
    ##FORMAT=<ID=PL,Number=3,Type=Float,Description=\"Normalized, Phred-scaled likelihoods for AA,AB,BB genotypes where A=ref and B=alt; not applicable if site is not biallelic\">
    ##source=FILE GENERATED BY BREEDBASE
    ##Genotyping protocol id(s)=$tissue_sample_protocol_id
    ##Genotyping protocol name(s)=Test Genotyping Protocol for Tissue Samples
    ##SynonymsOfAccessions=\" test_accession1=(test_accession1_synonym1)\"
    #CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	test_accession1_leaf-1	test_accession1_leaf-3
    1	10	S1_10	G	A	.	PASS	.	GT:AD:DP:GQ:PL:NT:DS	./.:0,0:0:.:1::NA	1/1:10,10:20:99:0,255,255:A,A:2
    ";
    # Remove leading spaces and tabs
    $vcf_response_string_expected =~ s/^[ ]+//mg;
    my @vcf_response_observed = read_file($vcf_file_path, chomp => 1);
    my @vcf_response_expected = split "\n", $vcf_response_string_expected;
    # remove lines with metadata about file date
    @vcf_response_observed = grep !/fileDate/, @vcf_response_observed;
    is_deeply(\@vcf_response_observed, \@vcf_response_expected);

    # COLUMN 1 WIZARD SEARCH - test list select / search - select trials
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]', 'xpath', 'find select column type in first column');
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="trials"]', 'xpath', 'find and select "trials" in first column');
    $t->send_keys_ok('(//div[contains(@class, "wizard-column")])[1]//textarea', 'xpath', 'Kasese solgs trial', 'find a search box and type Kasese solgs trial');

    sleep(1); # FIXME Waiting for attribute to be set by JS
    # COLUMN 1 WIZARD SEARCH - check if only "Kasese solgs trial" is in unselect panel field
    my $search_unselected = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-unselected")]',
        'xpath',
        'innerHTML',
        'find a content of "unselected trials panel" to test searchbox in first column');

    ok($search_unselected =~ /Kasese solgs trial/, "Verify if unselected panel after search contain: 'Kasese solgs trial'");
    ok($search_unselected !~ /CASS_6Genotypes_Sampling_2015/, "Verify if unselected panel after search NOT contain: 'CASS_6Genotypes_Sampling_2015'");
    ok($search_unselected !~ /trial2 NaCRRI/, "Verify if unselected panel after search NOT contain: 'trial2 NaCRRI'");

    # ADD A SECOND FILTER ITEM
    $t->send_keys_ok('(//div[contains(@class, "wizard-column")])[1]//textarea', 'xpath', KEYS->{'return'}, 'send return in search box');
    $t->send_keys_ok('(//div[contains(@class, "wizard-column")])[1]//textarea', 'xpath', 'trial2 NaCRRI', 'send trial2 NaCRRI in search box');

    sleep(1); # FIXME Waiting for attribute to be set by JS

    # check if both "Kasese solgs trial" and "trial2 NaCRRI" are in the unselect panel field
    $search_unselected = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-unselected")]',
        'xpath',
        'innerHTML',
        'find a content of "unselected trials panel" to test searchbox in first column');

    ok($search_unselected =~ /Kasese solgs trial/, "Verify if unselected panel after search contain: 'Kasese solgs trial'");
    ok($search_unselected !~ /CASS_6Genotypes_Sampling_2015/, "Verify if unselected panel after search NOT contain: 'CASS_6Genotypes_Sampling_2015'");
    ok($search_unselected =~ /trial2 NaCRRI/, "Verify if unselected panel after search contain: 'trial2 NaCRRI'");

    $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "Kasese solgs trial")]//preceding-sibling::button' , 'xpath', 'find and add "Kasese solgs trial" trial in first column with search filter active');

    # COLUMN 2 WIZARD SEARCH - test list select / search - select trials
    $t->click_ok('(//div[@class="panel-heading"])[2]/select', 'xpath', 'find select column type in second column');
    $t->click_ok('(//div[@class="panel-heading"])[2]/select//option[@value="traits"]', 'xpath', 'find and select "traits" in second column');
    $t->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "dry matter content percentage|CO_334:0000092")]//preceding-sibling::button' , 'xpath', 'find and add "dry matter content percentage|CO_334:0000092" trait in second column');

    # COLUMN 1 AND 2 - test for all / any / default values / check if numbers off possible combinations are changing
    my $active_union_button_text = $t->get_attribute_ok('(//div[@class="panel-body"])[1]//div[contains(@class, "wizard-union-toggle")]/div[contains(@class, "wizard-union-toggle-btn-group")]/button[contains(@class, "active")]' , 'xpath', 'innerHTML', 'find active union button in first column');
    ok(lc($active_union_button_text) eq "any", "default active union button for selection shall be ANY");

    my $button_count_all_second_column_xpath = '(//div[@class="panel-body"])[2]//div[@class="btn-group"]//span[contains(@class, "wizard-count-all")]';

    my $button_count_all_second_column_text = $t->get_text_ok($button_count_all_second_column_xpath , 'xpath', 'find count traits field pointer');
    ok($button_count_all_second_column_text eq "3", "number of traits with 'ANY button' in second panel from 'Kasese solgs trial' should be 3");

    $t->click_ok('(//div[contains(@class, "wizard-column")])[1]//button[contains(@class, "wizard-search-options-clear")]' , 'xpath', 'clear search input in first column, for union test');
    $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "trial2 NaCRRI")]//preceding-sibling::button' , 'xpath', 'find and select "trial2 NaCRRI" in first column');

    my $unselected_traits_second_column_xpath = '(//div[@class="panel-body"])[2]//ul[contains(@class, "wizard-list-unselected")]';

    my $unselected_traits_content = $t->get_attribute_ok($unselected_traits_second_column_xpath, 'xpath', 'innerHTML', 'find content of unselected list from second column');
    ok($unselected_traits_content =~ /harvest index variable|CO_334:0000015/, 'find new trait for two trials and ANY union "harvest index variable|CO_334:0000015"');

    $button_count_all_second_column_text = $t->get_text_ok($button_count_all_second_column_xpath , 'xpath', 'find count traits field pointer');
    ok($button_count_all_second_column_text eq "4", "number of traits with 'ANY button' in second panel from 'Kasese solgs trial' and 'trial2 NaCRRI' should be 4");

    $t->click_ok('(//div[@class="panel-body"])[1]//div[contains(@class, "wizard-union-toggle")]/div[contains(@class, "wizard-union-toggle-btn-group")]/button[contains(text(), "ALL")]' , 'xpath', 'find "ALL" button');

    $button_count_all_second_column_text = $t->get_text_ok($button_count_all_second_column_xpath , 'xpath', 'find count traits field pointer');
    ok($button_count_all_second_column_text eq "3", "ALL traits in second panel from 'Kasese solgs trial' and 'trial2 NaCRRI' should be 3");

    $unselected_traits_content = $t->get_attribute_ok($unselected_traits_second_column_xpath, 'xpath', 'innerHTML', 'find content of unselected list from second column"');
    ok($unselected_traits_content !~ /harvest index variable|CO_334:0000015/, '"harvest index variable|CO_334:0000015" trait for two trials and ALL union cannot be displayed in unselected traits');

    $t->click_ok('(//div[@class="panel-body"])[1]//div[contains(@class, "wizard-union-toggle")]/div[contains(@class, "wizard-union-toggle-btn-group")]/button[contains(text(), "ANY")]' , 'xpath', 'find "ANY" button');

    $button_count_all_second_column_text = $t->get_text_ok($button_count_all_second_column_xpath , 'xpath', 'find count traits field pointer');
    ok($button_count_all_second_column_text eq "4", "ANY traits in second panel from 'Kasese solgs trial' and 'trial2 NaCRRI' should be 4");

    $unselected_traits_content = $t->get_attribute_ok($unselected_traits_second_column_xpath, 'xpath', 'innerHTML', 'find content of unselected list from second column"');
    ok($unselected_traits_content =~ /harvest index variable|CO_334:0000015/, '"harvest index variable|CO_334:0000015" trait for two trials and ANY union shall be displayed in unselected traits');

    $t->click_ok('(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-selected wizard-list")]//a[contains(text(), "trial2 NaCRRI")]//preceding-sibling::button' , 'xpath', 'first select');

    $unselected_traits_content = $t->get_attribute_ok($unselected_traits_second_column_xpath, 'xpath', 'innerHTML', 'find content of unselected list from second column"');
    ok($unselected_traits_content !~ /harvest index variable|CO_334:0000015/, '"harvest index variable|CO_334:0000015" trait for one trial after "trial2 NaCRRI" removed should not be displayed in unselected traits');

    # COLUMN 3 WIZARD SEARCH - select years and save first dataset with 3 list
    $t->click_ok('(//div[@class="panel-heading"]/select)[3]', 'xpath', 'find select column type in third column');
    $t->click_ok('(//div[@class="panel-heading"]/select)[3]//option[@value="years"]', 'xpath', 'find and select "years" in third column');
    $t->click_ok('(//div[@class="panel-body"])[3]//a[contains(text(), "2014")]//preceding-sibling::button' , 'xpath', 'find and add "2014" year in third column');

    $t->send_keys_ok('input[placeholder="Create New Dataset"]', 'css', [KEYS->{'control'}, 'a'], 'select all in dataset name input field');
    $t->send_keys_ok('input[placeholder="Create New Dataset"]', 'css', KEYS->{'backspace'}, 'clear dataset name input field');

    my $dataset_name_1 = "another_dataset_3_columns";
    $t->send_keys_ok('input[placeholder="Create New Dataset"]', 'css', $dataset_name_1, 'type dataset name 1');
    $t->click_ok('//input[@placeholder="Create New Dataset"]/parent::div//button[contains(text(), "Create")]', 'xpath', "find 'create' button and create dataset $dataset_name_1");
    $t->accept_alert_ok('Accept alert for dataset 1 creation');

    # COLUMN 4 WIZARD SEARCH - select accessions and save second dataset
    my $type_column_4 = $t->find_element_ok('(//div[@class="panel-heading"]/select)[4]', 'xpath', 'find select column type in fourth column');
    $t->driver->execute_script( "arguments[0].scrollIntoView(true);window.scrollBy(0,-50);", $type_column_4);
    $t->click_ok('(//div[@class="panel-heading"]/select)[4]', 'xpath', 'find select column type in fourth column and click');
    $t->click_ok('(//div[@class="panel-heading"]/select)[4]//option[@value="accessions"]', 'xpath', 'find and select "accessions" in fourth column');
    $t->click_ok('(//div[@class="panel-body"])[4]//a[contains(text(), "UG120001")]//preceding-sibling::button' , 'xpath', 'find and add "UG120001" year in fourth column');

    $t->send_keys_ok('input[placeholder="Create New Dataset"]', 'css', [KEYS->{'control'}, 'a'], 'select all in dataset name input field and clear content');
    $t->send_keys_ok('input[placeholder="Create New Dataset"]', 'css', KEYS->{'backspace'}, 'backspace in dataset name input field and clear content');

    my $dataset_name_2 = "another_dataset_4_columns";
    $t->send_keys_ok('input[placeholder="Create New Dataset"]', 'css', $dataset_name_2, 'type dataset name 2');
    $t->click_ok('//input[@placeholder="Create New Dataset"]/parent::div//button[contains(text(), "Create")]', 'xpath', "find 'create' button and create dataset $dataset_name_2");
    ok($t->get_alert_text() =~ m/Dataset another_dataset_4_columns created/i, 'Created dataset another_dataset_4_columns');
    $t->accept_alert_ok('Accept alert for dataset 2 creation');

    # SAVE A LIST FROM COLUMN 1
    my $first_list_name = "trials_list";
    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[1]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        'find a "list name" for first column and fill a name');

    $t->send_keys_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[1]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        $first_list_name,
        "fill '$first_list_name' as list name in first column");

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[1]//button[contains(text(), "Create")]',
        'xpath',
        "find a 'create list' in first columns button and click");
    ok($t->get_alert_text() =~ m/1 items added to list trials_list/i, 'Add 1 item to trials_list');
    $t->accept_alert_ok('accept alert trials list');

    # SAVE A LIST FROM COLUMN 2
    my $second_list_name = "traits_list";
    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[2]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        'find a "list name" for second column and fill a name');

    $t->send_keys_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[2]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        $second_list_name,
        "fill '$second_list_name' as list name in second column");

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[2]//button[contains(text(), "Create")]',
        'xpath',
        "find a 'create list' in second columns button and click");
    ok($t->get_alert_text() =~ m/1 items added to list traits_list/i, 'Add 1 item to traits_list');
    $t->accept_alert_ok('accept alert traits list');

    # SAVE A LIST FROM COLUMN 3
    my $third_list_name = "years_list";

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[3]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        'find a "list name" for third column and fill a name');

    $t->send_keys_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[3]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        $third_list_name,
        "fill '$third_list_name' as list name in third column");

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[3]//button[contains(text(), "Create")]',
        'xpath',
        "find a 'create list' in third columns button and click");
    ok($t->get_alert_text() =~ m/1 items added to list years_list/i, 'added 1 item to years_list');
    $t->accept_alert_ok('accept alert years list');

    # SAVE A LIST FROM COLUMN 4
    my $fourth_list_name = "acc_list";
    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[4]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        'find a "list name" for fourth column and fill a name');

    $t->send_keys_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[4]//input[contains(@class, "wizard-create-list-name")]',
        'xpath',
        $fourth_list_name,
        "fill '$fourth_list_name' as list name in fourth column");

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[4]//button[contains(text(), "Create")]',
        'xpath',
        "find a 'create list' in fourth columns button and click");
    ok($t->get_alert_text() =~ m/1 items added to list acc_list/i, 'added 1 item to acc_list');
    $t->accept_alert_ok('accept alert acc list');

    # RELOAD PAGE AND LOAD DATASET_3_COLUMNS
    $t->get_ok('/breeders/search');
    sleep(1); # FIXME Need to wait for click handler to be registered

    $t->click_ok(
        '//select[contains(@class, "wizard-dataset-select")]',
        'xpath',
        'find a "select input" for datasets to load and click');

    $t->click_ok(
        "//select[contains(\@class, 'wizard-dataset-select')]/optgroup/option[contains(text(), '$dataset_name_1')]",
        'xpath',
        "find a dataset name: $dataset_name_1 in select input and click");

    $t->click_ok(
        '//div[contains(@class, "wizard-datasets")]//button[contains(@class, "wizard-dataset-load")]',
        'xpath',
        'find a load button for selected dataset and click');

    sleep(1); # FIXME Waiting for attribute to be set by JS
    # unselected 1 column
    my $unselected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-unselected")]',
        'xpath',
        'innerHTML',
        "find content of unselected list from first column");

    ok($unselected_reloaded_elements =~ /CASS_6Genotypes_Sampling_2015/, "Verify first column wizard, unselected after load $dataset_name_1: CASS_6Genotypes_Sampling_2015");
    ok($unselected_reloaded_elements =~ /trial2 NaCRRI/, "Verify first column wizard, unselected after load $dataset_name_1: trial2 NaCRRI");

    # selected 1 column
    my $selected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-selected wizard-list")]',
        'xpath',
        'innerHTML',
        "find content of selected list from first column");

    ok($selected_reloaded_elements =~ /Kasese solgs trial/, "Verify first column wizard, selected after load $dataset_name_1: Kasese solgs trial");

    # unselected 2 column
    $unselected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[2]//ul[contains(@class, "wizard-list-unselected")]',
        'xpath',
        'innerHTML',
        "find content of unselected list from second column");

    ok($unselected_reloaded_elements =~ /fresh root weight|CO_334:0000012/, "Verify second column wizard, unselected after load $dataset_name_1: fresh root weight|CO_334:0000012");
    ok($unselected_reloaded_elements =~ /fresh shoot weight measurement in kg|CO_334:0000016/, "Verify second column wizard, unselected after load $dataset_name_1: fresh shoot weight measurement in kg|CO_334:0000016");

    # selected 2 column
    $selected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[2]//ul[contains(@class, "wizard-list-selected wizard-list")]',
        'xpath',
        'innerHTML',
        "find content of selected list from second column");

    ok($selected_reloaded_elements =~ /dry matter content percentage|CO_334:0000092/, "Verify second column wizard, selected after load $dataset_name_1: dry matter content percentage|CO_334:0000092");

    # selected 3 column
    $selected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[3]//ul[contains(@class, "wizard-list-selected wizard-list")]',
        'xpath',
        'innerHTML',
        "find content of selected list from third column");

    ok($selected_reloaded_elements =~ /2014/, "Verify third column wizard, selected after load $dataset_name_1: 2014");

    # RELOAD PAGE AND LOAD DATASET_4_COLUMNS
    $t->get_ok('/breeders/search');
    sleep(1); # FIXME Need to wait for click handler to be registered

    $t->click_ok(
        '//select[contains(@class, "wizard-dataset-select")]',
        'xpath',
        'find a select input for datasets to load and click');

    $t->click_ok(
        "//select[contains(\@class, 'wizard-dataset-select')]/optgroup/option[text()='$dataset_name_2']",
        'xpath',
        "find a dataset name: $dataset_name_2 in select input and click");

    $t->click_ok(
        '//div[contains(@class, "wizard-datasets")]//button[contains(@class, "wizard-dataset-load")]',
        'xpath',
        'find a load button for selected dataset and click');
    $t->wait_for_working_dialog();

    # unselected 4 column
    $unselected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[4]//ul[contains(@class, "wizard-list-unselected")]',
        'xpath',
        'innerHTML',
        "find content of unselected list from fourth column");

    ok($unselected_reloaded_elements =~ /UG120002/, "Verify last column wizard, unselected after load $dataset_name_2: UG120002");
    ok($unselected_reloaded_elements =~ /UG120003/, "Verify last column wizard, unselected after load $dataset_name_2: UG120003");
    ok($unselected_reloaded_elements =~ /UG120007/, "Verify last column wizard, unselected after load $dataset_name_2: UG120007");

    # selected 4 column
    $selected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[4]//ul[contains(@class, "wizard-list-selected wizard-list")]',
        'xpath',
        'innerHTML',
        "find content of selected list from fourth column");

    ok($selected_reloaded_elements =~ /UG120001/, "Verify last column wizard, selected after load $dataset_name_2: UG120001");

    # RELOAD PAGE AND LOAD A LIST OF TRAILS
    $t->get_ok('/breeders/search');
    sleep(1); # FIXME Need to wait for click handler to be registered

    # RELOAD PAGE AND LOAD A LIST OF TRAILS
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]', 'xpath', 'find select column type in first column');

    $t->click_ok(
        "(//div[\@class='panel-heading']/select)[1]/optgroup/option[text()='$fourth_list_name']",
        'xpath',
        "find and select '$fourth_list_name' in first column");

    # selected 1 column - 2 new accessions and 1 old
    $selected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-selected wizard-list")]',
        'xpath',
        'innerHTML',
        "find content of selected list from first column");

    ok($selected_reloaded_elements =~ /UG120001/, "Verify first column wizard, selected after load $fourth_list_name: accession UG120001");

    # ADD TO LIST FUNCTIONALITY
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]', 'xpath', 'find select column type in first column');

    $t->click_ok(
        "(//div[\@class='panel-heading']/select)[1]//option[\@value='accessions']", 'xpath', 'find and select "accessions" in first column');

    $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "IITA-TMS-IBA011412")]//preceding-sibling::button' , 'xpath', 'find and add "IITA-TMS-IBA011412" accessions in first column');
    $t->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "IITA-TMS-IBA30572")]//preceding-sibling::button' , 'xpath', 'find and add "IITA-TMS-IBA30572" accessions in first column');

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[1]//select[contains(@class, "wizard-add-to-list")]',
        'xpath',
        'find a add to list select for first column');

    $t->click_ok(
        "(//table[contains(\@class, 'wizard-save-to-list')])[1]//select[contains(\@class, 'wizard-add-to-list')]/optgroup/option[text()='$fourth_list_name']",
        'xpath',
        "find a $fourth_list_name on lists name and select");

    $t->click_ok(
        '(//table[contains(@class, "wizard-save-to-list")])[1]//button[contains(@class, "wizard-add-to-list")]',
        'xpath',
        'find a button "add to list" and click');
    ok($t->get_alert_text() =~ m/The following items are already in the list and were not added: UG120001/i, 'UG120001 already exists in list');
    $t->accept_alert_ok('accept alert already in list');
    ok($t->get_alert_text() =~ m/2 items added to list/i, '2 items added to list');
    $t->accept_alert_ok('accept alert 2 items added');

    # reload to check a new acc_list with two extra accessions
    $t->get_ok('/breeders/search');

    sleep(1); # FIXME Need to wait for click handler to be registered
    # COLUMN 1 WIZARD SEARCH - load saved list with accessions acc_list
    $t->click_ok('(//div[@class="panel-heading"]/select)[1]', 'xpath', 'find select column type in first column');

    $t->click_ok(
        "(//div[\@class='panel-heading']/select)[1]/optgroup/option[text()='$fourth_list_name']",
        'xpath',
        "find and select '$fourth_list_name' in first column");

    # selected 1 column
    $selected_reloaded_elements = $t->get_attribute_ok(
        '(//div[@class="panel-body"])[1]//ul[contains(@class, "wizard-list-selected wizard-list")]',
        'xpath',
        'innerHTML',
        "find content of selected list from first column");

    ok($selected_reloaded_elements =~ /UG120001/, "Verify first column wizard, selected elements, after merging $fourth_list_name and two new elements: accession UG120001");
    ok($selected_reloaded_elements =~ /IITA-TMS-IBA011412/, "Verify first column wizard, selected elements, after merging $fourth_list_name and two new elements: accession IITA-TMS-IBA011412");
    ok($selected_reloaded_elements =~ /IITA-TMS-IBA30572/, "Verify first column wizard, selected elements, after merging $fourth_list_name and two new elements: accession IITA-TMS-IBA30572");

    #  TEST WORKING DETAILS PAGE FOR DATASET 1
    $t->get_ok('/search/datasets');

    sleep(1); # FIXME Need to wait for click handler to be registered
    $t->click_ok("//a[text()='$dataset_name_1']",'xpath','Checking for created dataset on dataset overview page');
    $t->wait_for_working_dialog();

    my $child_analyses = $t->get_text_ok('dataset_analysis_usage', 'id', 'Checking initial analysis usage');
    ok($child_analyses eq "(none)", 'Checking initial analysis usage');

    #  DELETE DATASET
    $t->get_ok('/breeders/search');

    sleep(1); # FIXME Need to wait for click handler to be registered
    $t->click_ok(
        '//select[contains(@class, "wizard-dataset-select")]',
        'xpath',
        'find a select input for datasets to delete and click');

    $t->click_ok(
        "//select[contains(\@class, 'wizard-dataset-select')]/optgroup/option[contains(text(), '$dataset_name_1')]",
        'xpath',
        "find a dataset name: $dataset_name_1 in select input and click");

    $t->click_ok(
        '//div[contains(@class, "wizard-datasets")]//button[contains(@class, "wizard-dataset-delete")]',
        'xpath',
        'find a "delete" dataset button for selected dataset and click');
    ok($t->get_alert_text() =~ m/Are you sure you would like to delete it/i, 'Confirm dataset deletion');
    $t->accept_alert_ok('accept alert delete dataset');
    ok($t->get_alert_text() =~ m/The dataset has been deleted/i, 'Dataset deleted');
    $t->accept_alert_ok('accept alert dataset deleted');

    # TEST DATASET WAS DELETED
    $t->get_ok('/breeders/search');

    my $datasets_list = $t->get_attribute_ok(
        '//select[contains(@class, "wizard-dataset-select")]',
        'xpath',
        'innerHTML',
        'find a select input for datasets to delete and click');

    ok($datasets_list =~ /$dataset_name_2/, "Verify if datasets list after 'delete' contain $dataset_name_2");
    ok($datasets_list !~ /$dataset_name_1/, "Verify if datasets list after 'delete' NOT contain $dataset_name_1");

    # DONE TESTING
    }
);

$t->driver()->quit();
$f->clean_up_db();
done_testing();

# Locate a file that is newer than the given timestamp.
# Useful when downloading genotype data through the UI,
# to find the correct output since it's dynamically named.
sub get_file_newer_than_timestamp {
     my ($pattern, $time_stamp, $max_attempts) = @_;

    my $num_attempts = 0;
    my $file_path;
    while(!$file_path && $num_attempts < $max_attempts){
        # find a file that is newer than the timestamp in epoch seconds
        my @downloaded_file_list = `find $pattern -type f -newermt "\@$time_stamp"`;
        my $num_files = scalar(@downloaded_file_list);
        $file_path = $num_files > 0 ? $downloaded_file_list[0] : undef;
        $num_attempts += 1;
        sleep(1);
    }
    if (defined($file_path)){
        chomp($file_path);
    }
    return $file_path;
}