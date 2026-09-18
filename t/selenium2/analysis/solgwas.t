use strict;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use Selenium::Firefox::Profile;

use File::Slurp qw(read_file);
use LWP::UserAgent;
use Shared::Genotypes qw(get_file_newer_than_timestamp);

my $t = SGN::Test::WWW::WebDriver->new();

# -----------------------------------------------------------------------------
# Browser Profile Setup: Automatically save CSV,TXT downloads to /downloads directory
# -----------------------------------------------------------------------------

my $profile = Selenium::Firefox::Profile->new;
$profile->set_preference( 'browser.download.folderList', 2 );
$profile->set_preference( 'browser.download.dir', '/downloads' );
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/csv;text/csv;text/plain' );
$profile->set_preference( 'dom.disable_open_during_load', \0 );

my $driver = Selenium::Remote::Driver->new(
    firefox_profile    => $profile,
    base_url           => $ENV{SGN_TEST_SERVER},
    remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost'
);
$t->driver($driver);

# -----------------------------------------------------------------------------
# Run Tests
# -----------------------------------------------------------------------------

$t->while_logged_in_as("curator", sub {
    $t->get_ok("tools/solgwas", "navigate to  SolGWAS page");
    $t->wait_for_network_idle();

    # -------------------------------------------------------------------------
    # Run GWAS

    $t->click_ok('//input[@name="dataset_select_checkbox" and @value="1"]', 'xpath', 'click dataset checkbox');
    $t->click_ok('selectDataset', 'id', 'click Select Dataset');
    $t->click_ok('//select[@id="pheno_select"]/option[text()="fresh root weight"]', 'xpath', 'select fresh root weight trait');
    $t->click_ok('runGWA', 'id', 'click Run SolGWAS');
    $t->wait_for_working_dialog();

    # -------------------------------------------------------------------------
    # Download the Results File

    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('SolGWAS_csv', 'id', 'click Download Results');

    # search for a csv file that is newer than before we clicked download
    my $csv_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/*gwasresults_pheno.csv",
        $download_time,
        10, # maximum find attempts
    );
    ok(defined($csv_file_path) && -e $csv_file_path, 'locate downloaded results file');
    my @gwas_results = read_file($csv_file_path, chomp => 1);
    ok(unlink($csv_file_path), 'delete downloaded results file');
    my @row_10 = split(",", @gwas_results[10]);
    like($row_10[3], qr/0.24113882/, "check value of row 10 in results table");

    # -------------------------------------------------------------------------
    # Download the Phenotypes File

    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('SolGWAS_phenotypes', 'id', 'click Download Input Phenotypes');

    # search for a txt file that is newer than before we clicked download
    my $phenotypes_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/*phenotype.txt",
        $download_time,
        10, # maximum find attempts
    );
    ok(defined($phenotypes_file_path) && -e $phenotypes_file_path, 'locate downloaded phenotypes file');
    my @phenotypes_observed = read_file($phenotypes_file_path, chomp => 1);
    ok(unlink($phenotypes_file_path), 'delete downloaded phenotypes file');
    my @row_10 = split("\t", @phenotypes_observed[10]);
    is(@row_10[40],  2.13, "check value of row fresh root weight in row 10");

    # -------------------------------------------------------------------------
    # Download the Genotypes File

    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('SolGWAS_genotypes', 'id', 'click Download Input Genotypes');

    # search for a txt file that is newer than before we clicked download
    my $genotypes_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/*genotype.txt",
        $download_time,
        10, # maximum find attempts
    );
    ok(defined($genotypes_file_path) && -e $genotypes_file_path, 'locate downloaded genotypes file');
    my @genotypes_observed = read_file($genotypes_file_path, chomp => 1);
    ok(unlink($genotypes_file_path), 'delete downloaded genotypes file');

    my @header = split("\t", @genotypes_observed[0]);
    my @row_10 = split("\t", @genotypes_observed[10]);    
    is(@header[10],  'UG120008', "check accession name in column 10 is UG120008");
    is(@row_10[0],  'S318_245078', "check marker in row 10 is S318_245078");
    is(@row_10[10],  1, "check genotype for UG120010 at S318_245078 is 0");

    # -------------------------------------------------------------------------
    # Check Images

    # Manhattan Plot
    my $manhattan_plot_src = $t->find_element('SolGWAS_Figure3', 'id')->get_attribute('src');
    my $ua = LWP::UserAgent->new;
    my $response = $ua->get($manhattan_plot_src);
    ok($response, 'Manhattan plot loaded successfully');

    # QQ Plot
    my $qq_plot_src = $t->find_element('SolGWAS_Figure4', 'id')->get_attribute('src');
    my $ua = LWP::UserAgent->new;
    my $response = $ua->get($qq_plot_src);
    ok($response, 'QQ plot loaded successfully');

    # -------------------------------------------------------------------------
    # Test Exclude Outliers

    $t->click_ok('dataset_trait_outliers', 'id', 'enable Exclude dataset outliers');
    $t->click_ok('runGWA', 'id', 'click Run SolGWAS');
    $t->wait_for_working_dialog();

    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('SolGWAS_csv', 'id', 'click Download Results');

    # search for a csv file that is newer than before we clicked download
    my $csv_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/*gwasresults_pheno.csv",
        $download_time,
        10, # maximum find attempts
    );
    ok(defined($csv_file_path) && -e $csv_file_path, 'locate downloaded outlier results file');
    my @gwas_results = read_file($csv_file_path, chomp => 1);
    ok(unlink($csv_file_path), 'delete downloaded outlier results file');
    my @row_10 = split(",", @gwas_results[10]);
    like($row_10[3], qr/0.81695853/, "check value of row 10 in outlier results table");
    $t->click_ok('dataset_trait_outliers', 'id', 'disable Exclude dataset outliers');
    
    # -------------------------------------------------------------------------
    # Include Kinship Matrix    

    $t->click_ok('kinshipmat', 'id', 'enable Kinship matrix');    
    $t->click_ok('runGWA', 'id', 'click Run SolGWAS');
    $t->wait_for_working_dialog();

    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('SolGWAS_csv', 'id', 'click Download Results');

    # search for a csv file that is newer than before we clicked download
    my $csv_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/*gwasresults_pheno.csv",
        $download_time,
        10, # maximum find attempts
    );
    ok(defined($csv_file_path) && -e $csv_file_path, 'locate downloaded kinship results file');
    my @gwas_results = read_file($csv_file_path, chomp => 1);
    ok(unlink($csv_file_path), 'delete downloaded kinship results file');
    my @row_10 = split(",", @gwas_results[10]);
    like($row_10[3], qr/0.24010364/, "check value of row 10 in kinship results table");
    $t->click_ok('kinshipmat', 'id', 'disable Kinship matrix'); 

    # -------------------------------------------------------------------------
    # Principle Component Analysis (PCA)

    $t->click_ok('preview_pca', 'id', 'click View PCA Plot');
    $t->wait_for_working_dialog();

    my $pca_plot_src = $t->find_element('SolGWAS_Figure2', 'id')->get_attribute('src');
    my $ua = LWP::UserAgent->new;
    my $response = $ua->get($pca_plot_src);
    ok($response, 'PCA plot loaded successfully');

    $t->click_ok('princomp', 'id', 'enable Principal Components');    
    $t->click_ok('runGWA', 'id', 'click Run SolGWAS');
    $t->wait_for_working_dialog();

    # save the current time, we will need this to find the correct downloaded file
    my $download_time = time();
    $t->click_ok('SolGWAS_csv', 'id', 'click Download Results');

    # search for a csv file that is newer than before we clicked download
    my $csv_file_path = get_file_newer_than_timestamp(
        "/selenium/downloads/*gwasresults_pheno.csv",
        $download_time,
        10, # maximum find attempts
    );
    ok(defined($csv_file_path) && -e $csv_file_path, 'locate downloaded PCA results file');
    my @gwas_results = read_file($csv_file_path, chomp => 1);
    ok(unlink($csv_file_path), 'delete downloaded PCA results file');
    my @row_10 = split(",", @gwas_results[10]);
    like($row_10[3], qr/0.08865218/, "check value of row 10 in PCA results table");
    $t->click_ok('princomp', 'id', 'disable Principal Components'); 
});

$t->driver->quit();
done_testing();
