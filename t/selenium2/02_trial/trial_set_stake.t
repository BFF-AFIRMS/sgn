use lib 't/lib';
use strict;
use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use Selenium::Firefox::Profile;
use Text::CSV;
use File::Slurp qw(read_file);

my $f = SGN::Test::Fixture->new();
my $t = SGN::Test::WWW::WebDriver->new();

# Setup Firefox profile for automatic downloads
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

    my $suffix = int(rand(1000));
    my $trial_name = "StakeSetTestTrial_" . $suffix;

    # Create CSV layout file containing stake and set columns
    my $trial_csv_content = "plot_name,accession_name,plot_number,block_number,is_a_control,rep_number,range_number,row_number,col_number,stake,set\n";
    $trial_csv_content .= "StakeSetPlot1_$suffix,test_accession1,1,1,0,1,1,1,1,12,3\n";
    $trial_csv_content .= "StakeSetPlot2_$suffix,test_accession2,2,1,0,1,1,1,2,13,4\n";

    my $trial_csv_path = "/tmp/trial_stake_set_$suffix.csv";
    open(my $fh_csv, '>', $trial_csv_path) or die $!;
    print $fh_csv $trial_csv_content;
    close($fh_csv);

    $t->get_ok('/breeders/trials', "Navigate to trials management page");
    $t->click_ok("upload_trial_link", "name", "Open upload trial dialog");
    $t->click_ok('next_step_upload_intro_button', 'id', "Click next on upload intro");
    $t->click_ok('//li[@id="upload_single_trial_design_tab"]/a', 'xpath', "Select single trial design tab");
    $t->click_ok('next_step_file_formatting_button', 'id', "Click next on file formatting");

    $t->wait_for_network_idle();

    $t->send_keys_ok("trial_upload_name", "id", $trial_name, "Enter trial name");
    $t->click_ok('//select[@id="trial_upload_breeding_program"]/option[@value="test"]', 'xpath', "Select breeding program");
    $t->click_ok('//select[@id="trial_upload_location"]/option[@value="test_location"]', 'xpath', "Select location");
    $t->click_ok('//select[@id="trial_upload_trial_type"]/option[@title="phenotyping_trial"]', 'xpath', "Select trial type");
    $t->click_ok('//select[@id="trial_upload_year"]/option[@value="2016"]', 'xpath', "Select trial year");
    $t->send_keys_ok("trial_upload_description", "id", 'Test layout upload with stake and set', "Enter description");
    $t->click_ok('//select[@id="trial_upload_design_method"]/option[@value="RCBD"]', 'xpath', "Select design method");
    $t->click_ok('//select[@id="trial_upload_trial_stock_type"]/option[@value="accession"]', 'xpath', "Select stock type");

    my $remote_path = $t->driver()->upload_file($trial_csv_path);
    $t->send_keys_ok("trial_uploaded_file", "id", $remote_path, "Provide trial layout file");

    $t->click_ok('next_step_trial_information_button', 'id', "Click next on trial info");

    $t->click_ok("upload_trial_trial_sourced", "id", "find trial sourced select");
    $t->click_ok('//select[@id="upload_trial_trial_sourced"]/option[@value="no"]', 'xpath', "Select 'no' as value for trial sourced");

    $t->click_ok("upload_trial_trial_will_be_genotyped", "id", "find 'trial will be genotyped' select");
    $t->click_ok('//select[@id="upload_trial_trial_will_be_genotyped"]/option[@value="no"]', 'xpath', "Select 'no' as value for trial will be genotyped");

    $t->click_ok("upload_trial_trial_will_be_crossed", "id", "find 'trial will be crossed' select");
    $t->click_ok('//select[@id="upload_trial_trial_will_be_crossed"]/option[@value="no"]', 'xpath', "Select 'no' as value for trial will be crossed");

    $t->click_ok("upload_trial_validate_form_button", "id", "Click validate upload form");
    $t->wait_for_network_idle();
    $t->click_ok("upload_trial_submit_first", "name", "Click submit trial upload");
    $t->wait_for_working_dialog();
    $t->click_ok("close_trial_upload_dialog", "id", "Close upload success dialog");

    my $project = $schema->resultset('Project::Project')->search({ name => $trial_name })->first();
    ok($project, "Check if trial '$trial_name' was created in the database");
    my $trial_id = $project->project_id();

    $t->get_ok('/breeders/trial/' . $trial_id, "Navigate to new trial detail page");
    $t->wait_for_network_idle();

    # Open Experimental Design section
    $t->click_ok('trial_design_section_onswitch', 'id', "Expand experimental design section");
    $t->wait_for_network_idle();

    # Open Plots subsection to load the AJAX table
    $t->click_ok('trial_plots_onswitch', 'id', "Expand plots subsection");
    $t->wait_for_network_idle();

    my $plots_table_content = $t->get_attribute_ok(
        'plots_from_trial_select_table',
        'id',
        'innerHTML',
        "Retrieve plots table content"
    );

    # Verify column headers and contents
    ok($plots_table_content =~ /<th>Stake<\/th>/, "Verify plots table contains 'Stake' column header");
    ok($plots_table_content =~ /<th>Set<\/th>/, "Verify plots table contains 'Set' column header");
    ok($plots_table_content =~ /<td>12<\/td>/, "Verify plot 1 stake value '12' is displayed");
    ok($plots_table_content =~ /<td>3<\/td>/, "Verify plot 1 set value '3' is displayed");
    ok($plots_table_content =~ /<td>13<\/td>/, "Verify plot 2 stake value '13' is displayed");
    ok($plots_table_content =~ /<td>4<\/td>/, "Verify plot 2 set value '4' is displayed");

    # Download Layout
    $t->click_ok('trial_download_layout_button', 'id', "Open download layout dialog");
    $t->wait_for_network_idle();

    # Check "Stake Number" and "Set Number" checkboxes in the dialog
    $t->click_ok('//input[@data-column="stake_number"]', 'xpath', "Select stake number column");
    $t->click_ok('//input[@data-column="set_number"]', 'xpath', "Select set number column");

    $t->click_ok('create_fieldbook_ok_button_TrialLayout', 'id', "Submit layout download request");
    sleep(5); # Wait for browser to process the download

    # Verify downloaded content
    my $download_path = "/selenium/downloads/${trial_name}_layout.csv";
    ok(-e $download_path, "Verify downloaded layout file exists on disk");

    my $csv = Text::CSV->new ({ binary => 1, auto_diag => 1 });
    open my $fh, "<:encoding(utf8)", $download_path or die "Could not open $download_path: $!";
    my $header = $csv->getline($fh);
    my %col_map = map { $header->[$_] => $_ } 0..$#$header;

    ok(exists $col_map{stake_number}, "Verify header contains stake_number column");
    ok(exists $col_map{set_number}, "Verify header contains set_number column");

    my $row1 = $csv->getline($fh);
    is($row1->[$col_map{plot_name}], "StakeSetPlot1_$suffix", "Verify plot 1 name");
    is($row1->[$col_map{stake_number}], "12", "Verify plot 1 stake_number");
    is($row1->[$col_map{set_number}], "3", "Verify plot 1 set_number");

    my $row2 = $csv->getline($fh);
    is($row2->[$col_map{plot_name}], "StakeSetPlot2_$suffix", "Verify plot 2 name");
    is($row2->[$col_map{stake_number}], "13", "Verify plot 2 stake_number");
    is($row2->[$col_map{set_number}], "4", "Verify plot 2 set_number");

    close $fh;
    unlink $trial_csv_path;
    unlink $download_path;
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
