use lib 't/lib';
use strict;
use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use Selenium::Firefox::Profile;
use Text::CSV;
use SGN::Model::Cvterm;
use File::Slurp qw(read_file);

use Shared::Phenotypes;
use CXGN::Phenotypes::Missing;

my $f = SGN::Test::Fixture->new();
my $t = SGN::Test::WWW::WebDriver->new();

# Setup Firefox profile for automatic downloads
# The path /downloads on the selenium host is shared with the host and typically 
# mapped to /selenium/downloads on the breedbase (web) host.
my $profile = Selenium::Firefox::Profile->new;
$profile->set_preference( 'browser.download.folderList', 2 );
$profile->set_preference( 'browser.download.dir', '/downloads' );
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/csv' );

my $driver = Selenium::Remote::Driver->new(
    firefox_profile => $profile,
    base_url => $ENV{SGN_TEST_SERVER},
    remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost'
);
$t->driver($driver);

$t->while_logged_in_as("curator", sub {
    my $schema = $f->bcs_schema;
    
    # Create test stocks with explicit parent relationships
    my $accession_type_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'accession', 'stock_type')->cvterm_id();
    my $female_parent_rel_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'female_parent', 'stock_relationship')->cvterm_id();
    my $male_parent_rel_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'male_parent', 'stock_relationship')->cvterm_id();
    my $organism = $schema->resultset("Organism::Organism")->first();

    # Use random suffixes to avoid name collisions in local development environments
    my $suffix = int(rand(1000));
    my $female_name = "FemaleParentTest" . $suffix;
    my $male_name = "MaleParentTest" . $suffix;
    my $progeny_name = "ProgenyTest" . $suffix;

    my $female = $schema->resultset("Stock::Stock")->create({
        uniquename => $female_name,
        name => $female_name,
        type_id => $accession_type_id,
        organism_id => $organism->organism_id,
    });
    my $male = $schema->resultset("Stock::Stock")->create({
        uniquename => $male_name,
        name => $male_name,
        type_id => $accession_type_id,
        organism_id => $organism->organism_id,
    });
    my $progeny = $schema->resultset("Stock::Stock")->create({
        uniquename => $progeny_name,
        name => $progeny_name,
        type_id => $accession_type_id,
        organism_id => $organism->organism_id,
    });

    $schema->resultset("Stock::StockRelationship")->create({
        subject_id => $female->stock_id,
        object_id => $progeny->stock_id,
        type_id => $female_parent_rel_id,
    });
    $schema->resultset("Stock::StockRelationship")->create({
        subject_id => $male->stock_id,
        object_id => $progeny->stock_id,
        type_id => $male_parent_rel_id,
    });

    # Upload a trial using the progeny
    my $trial_csv_content = "plot_name,accession_name,plot_number,block_number,is_a_control,rep_number,range_number,row_number,col_number\n";
    $trial_csv_content .= "DownloadParentsPlot$suffix,$progeny_name,1,1,0,1,1,1,1\n";
    $trial_csv_content .= "MissingPhenotypesPlot$suffix,$progeny_name,2,1,0,2,1,1,2\n";

    my $trial_csv_path = "/tmp/trial_parents_test_$suffix.csv";
    open(my $fh_csv, '>', $trial_csv_path) or die $!;
    print $fh_csv $trial_csv_content;
    close($fh_csv);

    $t->get_ok('/breeders/trials', "Navigate to trials management page");
    $t->click_ok("upload_trial_link", "name", "Open upload trial dialog");
    $t->click_ok('next_step_upload_intro_button', 'id', "Click next on upload intro");
    $t->click_ok('//li[@id="upload_single_trial_design_tab"]/a', 'xpath', "Select single trial design tab");
    $t->click_ok('next_step_file_formatting_button', 'id', "Click next on file formatting");

    my $trial_name = "DownloadParentsTestTrial" . $suffix;
    $t->wait_for_network_idle();

    $t->send_keys_ok("trial_upload_name", "id", $trial_name, "Enter trial name");
    $t->click_ok('//select[@id="trial_upload_breeding_program"]/option[@value="test"]', 'xpath', "Select breeding program");
    $t->click_ok('//select[@id="trial_upload_location"]/option[@value="test_location"]', 'xpath', "Select location");
    $t->click_ok('//select[@id="trial_upload_trial_type"]/option[@title="phenotyping_trial"]', 'xpath', "Select trial type");
    $t->click_ok('//select[@id="trial_upload_year"]/option[@value="2024"]', 'xpath', "Select trial year");
    $t->send_keys_ok("trial_upload_description", "id", 'Test layout download with parents', "Enter description");
    $t->click_ok('//select[@id="trial_upload_design_method"]/option[@value="CRD"]', 'xpath', "Select design method");
    $t->click_ok('//select[@id="trial_upload_trial_stock_type"]/option[@value="accession"]', 'xpath', "Select stock type");

    my $remote_path = $t->driver()->upload_file($trial_csv_path);
    $t->send_keys_ok("trial_uploaded_file", "id", $remote_path, "Provide trial layout file");

    $t->click_ok('next_step_trial_information_button', 'id', "Click next on trial info");
    $t->click_ok("upload_trial_validate_form_button", "id", "Click validate upload form");
    $t->wait_for_network_idle();
    $t->click_ok("upload_trial_submit_first", "name", "Click submit trial upload");
    $t->wait_for_working_dialog();
    $t->click_ok("close_trial_upload_dialog", "id", "Close upload success dialog");

    # Navigate to trial page and perform layout download with parent columns
    sleep(1);
    my $project = $schema->resultset('Project::Project')->search({ name => $trial_name })->first();
    ok($project, "Check if trial '$trial_name' was created in the database");
    my $trial_id = $project->project_id();
    $t->get_ok('/breeders/trial/' . $trial_id, "Navigate to new trial detail page");
    $t->wait_for_network_idle();

    # Expand the Experimental Design section to make the download button visible and clickable
    $t->click_ok('trial_design_section_onswitch', 'id', "Expand experimental design section");
    $t->wait_for_network_idle();

    $t->click_ok('trial_download_layout_button', 'id', "Open download layout dialog");

    # Select the new parent columns in the checkbox grid
    $t->click_ok('//input[@data-column="female_parent"]', 'xpath', "Select female parent column");
    $t->click_ok('//input[@data-column="male_parent"]', 'xpath', "Select male parent column");
    $t->click_ok('create_fieldbook_ok_button_TrialLayout', 'id', "Submit layout download request");
    sleep(5); # Wait for browser to process the download

    # Verify downloaded content
    my $download_path = "/selenium/downloads/${trial_name}_layout.csv";
    ok(-e $download_path, "Verify downloaded layout file exists on disk");

    my $csv = Text::CSV->new ({ binary => 1, auto_diag => 1 });
    open my $fh, "<:encoding(utf8)", $download_path or die "Could not open $download_path: $!";
    my $header = $csv->getline($fh);
    my %col_map = map { $header->[$_] => $_ } 0..$#$header;

    ok(exists $col_map{female_parent}, "Verify header contains female_parent column");
    ok(exists $col_map{male_parent}, "Verify header contains male_parent column");

    my $row = $csv->getline($fh);
    is($row->[$col_map{accession_name}], $progeny_name, "Verify accession name in downloaded row");
    is($row->[$col_map{female_parent}], $female_name, "Verify female parent name in downloaded row");
    is($row->[$col_map{male_parent}], $male_name, "Verify male parent name in downloaded row");

    close $fh;
    unlink $trial_csv_path;

    # -------------------------------------------------------------------------
    # Download missing measurements format
    # -------------------------------------------------------------------------

    my @missing_formats;

    # Add phenotypes for us to test expected vs observed values
    $t->get_ok('/breeders/trial/' . $trial_id, "Navigate to new trial detail page");
    $t->wait_for_network_idle();

    # Add a phenotype to the plot DownloadParentsPlot
    my $phenotype_value = "10";
    $t->click_ok("direct_phenotyping_link", "id", "Open direct phenotyping page");
    $t->click_ok("//select[\@id='plot_name']/option[\@value='DownloadParentsPlot$suffix']", 'xpath', "Select plot name");
    $t->click_ok('//select[@id="select_traits_for_trait_file"]/option[@title="fresh root weight|CO_334:0000012"]', 'xpath', "Select fresh root weight");
    $t->send_keys_ok("select_pheno_value", "id", $phenotype_value, "enter phenotype value");
    $t->click_ok("pagetitle", "id", "click elsewhere to finalize entry");
    $t->find_element_ok('//div[@id="success-trial-phenotype" and not(contains(@style, "display: none"))]', "xpath", "wait for success indicator");

    my $plot_1_id = $schema->resultset("Stock::Stock")->find({ uniquename => "DownloadParentsPlot$suffix" })->stock_id();
    my $plot_2_id = $schema->resultset("Stock::Stock")->find({ uniquename => "MissingPhenotypesPlot$suffix" })->stock_id();
    my $progeny_id = $schema->resultset("Stock::Stock")->find({ uniquename => $progeny_name })->stock_id();

    # Build our expected values for each missing format
    foreach my $format (@DOWNLOAD_MISSING_FORMATS) {
        my $char = $MISSING_FORMATS{$format};

        my $expected_csv = '"plot_name","plot_id","accession_name","plot_number","block_number","is_a_control","rep_number","row_number","col_number","fresh root weight|CO_334:0000012"
        "DownloadParentsPlot' . $suffix . '","' . $plot_1_id . '","' . $progeny_name . '","1","1","","1","1","1","' . $phenotype_value . '"
        "MissingPhenotypesPlot' . $suffix . '","' . $plot_2_id . '","' . $progeny_name . '","2","1","","2","1","2","' . $char . '"';
        # Trim leading whitespace
        $expected_csv =~ s/^[ ]+//mg;
        my @expected = split "\n", $expected_csv;
        my @data = ($format, $char, \@expected);

        push(@missing_formats, \@data);
    }

    # -------------------------------------------------------------------------
    # Trial -> Experimental Design -> Download Layout

    $t->get_ok('/breeders/trial/' . $trial_id, "Navigate to new trial detail page");
    $t->wait_for_network_idle();

    # Expand the Experimental Design section to make the download button visible and clickable
    $t->click_ok('trial_design_section_onswitch', 'id', "Expand experimental design section");
    $t->wait_for_network_idle();
    $t->click_ok('trial_download_layout_button', 'id', "Open download layout dialog");
    $t->click_ok('//input[@id="create_fieldbook_include_measured_TrialLayout"]/parent::*//label[contains(@class, "toggle-off")]', 'xpath', "Click include phenotypes");

    # Test all download formats have the expected values
    for my $format (@missing_formats){
        my ($value, $char, $expected) = @$format;
        my $layout_download_path = "/selenium/downloads/${trial_name}_layout.csv";
        my $observed = download_missing_phenotypes_csv(
            $t,
            'create_fieldbook_missing_format_TrialLayout', # select id
            $value,                                        # select value
            'create_fieldbook_ok_button_TrialLayout',      # submit id
            $layout_download_path,                         # path file will be downloaded to
        );
        is_deeply($observed, $expected, 'download layout file has expected values');
    }

    # -------------------------------------------------------------------------
    # Trial -> Phenotype Summary Statistics -> Download Trial Data

    # Update our expected values for this download format
    for my $i (0 .. $#missing_formats) {
        my $char = $missing_formats[$i][1];

        my $expected_csv = '"studyYear","programDbId","programName","programDescription","studyDbId","studyName","studyDescription","studyDesign","plotWidth","plotLength","fieldSize","fieldTrialIsPlannedToBeGenotyped","fieldTrialIsPlannedToCross","plantingDate","harvestDate","locationDbId","locationName","germplasmDbId","germplasmName","germplasmSynonyms","observationLevel","observationUnitDbId","observationUnitName","replicate","blockNumber","plotNumber","rowNumber","colNumber","entryType","plantNumber","fresh root weight|CO_334:0000012","notes"
        "2024","134","test","test","' . $trial_id . '","' . $trial_name . '","Test layout download with parents","CRD","","","","no","no","","","23","test_location","' . $progeny_id . '","' . $progeny_name . '","","plot","' . $plot_1_id . '","DownloadParentsPlot' . $suffix . '","1","1","1","1","1","test","","10",""
        "2024","134","test","test","' . $trial_id . '","' . $trial_name . '","Test layout download with parents","CRD","","","","no","no","","","23","test_location","' . $progeny_id . '","' . $progeny_name . '","","plot","' . $plot_2_id . '","MissingPhenotypesPlot' . $suffix . '","2","1","2","1","2","test","","' . $char . '",""';

        # Trim leading whitespace
        $expected_csv =~ s/^[ ]+//mg;
        my @expected = split "\n", $expected_csv;
        $missing_formats[$i][2] = \@expected
    }

    $t->get_ok('/breeders/trial/' . $trial_id, "Navigate to new trial detail page");
    $t->wait_for_network_idle();

    # Expand the Phenotype Summary Statistics section to make the download button visible and clickable
    $t->click_ok('trial_detail_traits_assayed_onswitch', 'id', "Expand phenotype summary statistics section");
    $t->wait_for_network_idle();

    $t->click_ok('trial_download_phenotypes_button', 'id', 'click download trial data button');
    $t->click_ok('//select[@id="download_trial_phenotypes_traits_select"]/option[contains(@title, "fresh root weight")]', 'xpath', "Select fresh root weight");
    $t->click_ok('download_trial_phenotypes_additional_options_onswitch', 'id', 'Open additional search options');

    # Test all download formats have the expected values
    for my $format (@missing_formats){
        my ($value, $char, $expected) = @$format;
        my $phenotypes_download_path = "/selenium/downloads/${trial_name}_phenotypes.csv";
        my $observed = download_missing_phenotypes_csv(
            $t,
            'download_trial_phenotypes_missing_format', # select id
            $value,                                     # select value
            'download_trial_phenotypes_submit_button',  # submit id
            $phenotypes_download_path,                  # path file will be downloaded to
        );
        # Keep only the last three lines which are the header and data
        my @observed = splice(@$observed, -3);
        is_deeply(\@observed, $expected, 'download trial data file has expected values');
    }

    # -------------------------------------------------------------------------
    # Manage -> Trials -> Download Phenotypes

    # This has the same format as the previous, use those expected values

    $t->get_ok('/breeders/trials/', "Navigate to manage trials page");
    $t->wait_for_network_idle();
    $t->click_ok('//i[contains(@class, "jstree-icon")]', 'xpath', 'Expand trial tree');
    $t->click_ok($trial_name, 'partial_link_text', 'Select trial in tree');
    $t->click_ok('trials_download_phenotypes_button', 'id', 'Click download phenotypes button');

    $t->click_ok('download_trials_phenotypes_additional_options_onswitch', 'id', 'Open additional search options');

    # Test all download formats have the expected values
    for my $format (@missing_formats){
        my ($value, $char, $expected) = @$format;
        my $phenotypes_download_path = "/selenium/downloads/${trial_name}_phenotypes.csv";
        my $observed = download_missing_phenotypes_csv(
            $t,
            'download_trials_phenotypes_missing_format', # select id
            $value,                                      # select value
            'download_trials_phenotypes_submit_button',  # submit id
            $phenotypes_download_path,                   # path file will be downloaded to
        );
        # Keep only the last three lines which are the header and data
        my @observed = splice(@$observed, -3);
        is_deeply(\@observed, $expected, 'download trials data file has expected values');
    }
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
