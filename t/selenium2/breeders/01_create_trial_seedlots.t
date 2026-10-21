use strict;
use warnings;

use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use Selenium::Waiter qw(wait_until);
use CXGN::List;
use CXGN::Stock::Seedlot;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;
my $dbh = $f->dbh;

# Retrieve user ID for 'submitter' (johndoe)
my ($user_id) = $dbh->selectrow_array("SELECT sp_person_id FROM sgn_people.sp_person WHERE username = 'johndoe'");
$user_id ||= 41;

# Resolve test breeding program and location
my $bp = $schema->resultset('Project::Project')->find({ name => 'test' });
my $breeding_program_id = $bp->project_id;
my $location_name = 'test_location';

# Resolve test accessions
my $acc1_name = 'test_accession1';
my $acc2_name = 'test_accession2';
my $acc3_name = 'test_accession3';
my $acc1_stock = $schema->resultset('Stock::Stock')->find({ uniquename => $acc1_name });
my $acc2_stock = $schema->resultset('Stock::Stock')->find({ uniquename => $acc2_name });
my $acc3_stock = $schema->resultset('Stock::Stock')->find({ uniquename => $acc3_name });
ok($acc1_stock, "Accession $acc1_name exists");
ok($acc2_stock, "Accession $acc2_name exists");
ok($acc3_stock, "Accession $acc3_name exists");

# Create a seedlot for test_accession1 only (test_accession2 and test_accession3 have no seedlots)
my $seedlot = CXGN::Stock::Seedlot->new(schema => $schema);
my $rand_suffix = int(rand(100000));
my $seedlot_name = sprintf("Seedlot_acc1_%d", $rand_suffix);
$seedlot->uniquename($seedlot_name);
$seedlot->location_code($location_name);
$seedlot->accession_stock_id($acc1_stock->stock_id);
$seedlot->breeding_program_id($breeding_program_id);
ok($seedlot->store(), "Created seedlot $seedlot_name for $acc1_name");

# Create test lists using CXGN::List
sub create_test_list {
    my ($name, $type, $items) = @_;
    my $list_id = CXGN::List::create_list($dbh, $name, "Test list $name", $user_id);
    my $list = CXGN::List->new({ dbh => $dbh, list_id => $list_id });
    $list->type($type);
    $list->add_bulk($items) if $items && @$items;
    return $list_id;
}

my $acc_list_name = sprintf("Test_Accessions_Valid_%d", $rand_suffix);
my $acc_list_id = create_test_list($acc_list_name, 'accessions', [$acc1_name]);

my $check_list_name = sprintf("Test_Checks_NoSeedlot_%d", $rand_suffix);
my $check_list_id = create_test_list($check_list_name, 'accessions', [$acc2_name]);

my $seedlot_list_name = sprintf("Test_Seedlots_%d", $rand_suffix);
my $seedlot_list_id = create_test_list($seedlot_list_name, 'seedlots', [$seedlot_name]);

my $invalid_seedlot_name = sprintf("Nonexistent_Seedlot_%d", $rand_suffix);
my $invalid_seedlot_list_name = sprintf("Test_Invalid_Seedlots_%d", $rand_suffix);
my $invalid_seedlot_list_id = create_test_list($invalid_seedlot_list_name, 'seedlots', [$invalid_seedlot_name]);

$t->while_logged_in_as("submitter", sub {
    # =========================================================================
    # TEST CASE 1: Required Stock List Seedlot Failure (Blocks Progression)
    # =========================================================================
    $t->get_ok('/breeders/trial/create');

    # Screen 1: Intro
    $t->click_ok('next_step_intro_button', 'id', 'Click Go to Next Step on Intro');

    # Screen 2: Trial Information
    $t->click_ok('select_breeding_program', 'id', 'Click breeding program select');
    $t->click_ok('//select[@id="select_breeding_program"]/option[@value="test"]', 'xpath', "Select breeding program 'test'");

    $t->click_ok('//select[@id="add_project_location"]/option[@value="test_location"]', 'xpath', "Select location 'test_location'");

    my $trial_name = sprintf("Trial_seedlot_%d", $rand_suffix);
    $t->send_keys_ok('new_trial_name', 'id', $trial_name, "Enter trial name $trial_name");

    $t->click_ok('add_project_type', 'id', "Click project type select");
    $t->click_ok('//select[@id="add_project_type"]/option[@title="misc_trial"]', 'xpath', "Select trial type 'misc_trial'");

    $t->click_ok('add_project_year', 'id', "Click trial year select");
    $t->click_ok('//select[@id="add_project_year"]/option[@value="2015"]', 'xpath', "Select year '2015'");

    $t->send_keys_ok('add_project_description', 'id', "Test seedlot verification behavior", "Enter project description");

    $t->find_element_ok('select_stock_type', 'id', "Find stock type select");
    $t->click_ok('//select[@id="select_stock_type"]/option[@value="accession"]', 'xpath', "Select stock type 'accession'");

    $t->click_ok('select_design_method', 'id', "Click design method select");
    $t->click_ok('//select[@id="select_design_method"]/option[@value="CRD"]', 'xpath', "Select design method 'CRD'");

    # Screen 3: Design Details - Select invalid seedlot list
    $t->send_keys_ok('rep_count', 'id', "1", "Set rep count to 1");
    $t->click_option_ok('//select[@id="select_list_list_select"]/option[@value="' . $acc_list_id . '"]', 'xpath', "Select accession list");
    $t->click_option_ok('//select[@id="select_seedlot_list_list_select"]/option[@value="' . $invalid_seedlot_list_id . '"]', 'xpath', "Select invalid seedlot list");
    $t->send_keys_ok('num_seed_per_plot', 'id', "5", "Enter 5 seeds per plot");

    sleep(1);
    $t->click_ok('new_trial_submit', 'id', 'Click Continue to Next Step with invalid seedlot');

    # Verify seedlot error alert appears and blocks progression
    $t->wait_for_alert_appear();
    my $fail_alert_text = $t->get_alert_text();
    like($fail_alert_text, qr/Stock list/i, "Verify alert message indicates stock list verification error");
    like($fail_alert_text, qr/$invalid_seedlot_name/i, "Verify alert mentions invalid seedlot $invalid_seedlot_name");
    $t->accept_alert_ok("Accept seedlot error alert");

    # Ensure the user remains on the Design Details step (not advanced to Review)
    $t->find_element_ok('new_trial_submit', 'id', "Still on design details step after required seedlot failure");

    # =========================================================================
    # TEST CASE 2: Optional Check Seedlot Warning (Shows Alert, Continues & Saves)
    # =========================================================================
    # Switch to the valid seedlot list and add a check list (which has no seedlots in the seedlot list)
    $t->click_option_ok('//select[@id="select_seedlot_list_list_select"]/option[@value="' . $seedlot_list_id . '"]', 'xpath', "Select valid seedlot list");
    $t->click_option_ok('//select[@id="crbd_list_of_checks_section_list_select"]/option[@value="' . $check_list_id . '"]', 'xpath', "Select check list without seedlots");

    sleep(1);
    $t->click_ok('new_trial_submit', 'id', 'Click Continue to Next Step with valid seedlot list');

    # Wait for design generation to finish
    $t->wait_for_working_dialog();
    $t->wait_for_network_idle();

    # Verify workflow successfully advanced to Review Design step
    $t->find_element_ok('trial_design_view_layout_return', 'id', "Find layout table in review step");
    my $layout_table_text = $t->get_text('trial_design_view_layout_return', 'id');
    like($layout_table_text, qr/$seedlot_name/, "Layout table contains seedlot name for experimental accession");
    like($layout_table_text, qr/$acc1_name/, "Layout table contains experimental accession name");
    like($layout_table_text, qr/$acc2_name/, "Layout table contains check accession name");

    # Confirm and save trial in database
    $t->click_ok('new_trial_confirm_submit', 'id', "Click Confirm to save trial in database");
    $t->wait_for_working_dialog();
    $t->wait_for_network_idle();

    # Complete screen
    $t->click_ok('//div[@class="panel-body"]//div[@class="workflow-complete-message workflow-message-show"]//button[@id="create_trial_success_complete_button"]',
        'xpath', 'Click complete button on final screen');
    $t->wait_for_network_idle();

    # Verify trial was created in database
    my $trial = $f->bcs_schema->resultset('Project::Project')->find({ name => $trial_name });
    ok($trial, "Trial $trial_name was created and saved in database with optional check seedlots");

    # Clean up test lists
    for my $id ($acc_list_id, $check_list_id, $seedlot_list_id, $invalid_seedlot_list_id) {
        eval { CXGN::List::delete_list($dbh, $id); };
    }
});

$t->driver->close();
done_testing();
