
use strict;

use lib 't/lib';

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use Selenium::Waiter qw(wait_until);
use Shared::AddTrial qw/
    open_add_trial
    fill_trial_info
    fill_design_info
    continue_to_review
    confirm_and_save
    finish_trial_creation
/;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $dbh = $f->dbh;

# The fixture database ships a list of accessions named "accessions2add".
# Resolve it to its id so the wizard can select it by value.
my ($acc_list_id) = $dbh->selectrow_array(
	"SELECT list_id FROM sgn_people.list WHERE name = 'accessions2add'");

$t->while_logged_in_as("submitter", sub {
	open_add_trial($t);

	my $trial_name = fill_trial_info($t,
		trial_name  => sprintf("Trial_treatment_selenium_%d", int(rand(10000))),
		description => "Test trial with field treatments selenium",
	);

	fill_design_info($t,
		design_type => 'CRD',
		stock_list  => $acc_list_id,
		checks_list => 4,
		rep_count   => "1",
	);

	continue_to_review($t);

	# SCREEN 4 /Review design - Field Treatments/
	$t->find_element_ok('add_trial_treatments_button', 'id', "find Add Field Treatments button");
	$t->click_ok('add_trial_treatments_button', 'id', "click Add Field Treatments button to open modal");

	# Modal Step 1: Treatment Details
	$t->find_element_ok('trial_design_add_treatments', 'id', "find Add Treatments modal");
	my $treatment_name = sprintf("Fertilizer_%d", int(rand(1000)));
	$t->send_keys_ok('new_treatment_name', 'id', $treatment_name, "enter treatment name");
	$t->send_keys_ok('new_treatment_description', 'id', "Selenium test fertilizer treatment description", "enter treatment description");

	$t->click_ok('new_trial_add_treatments_continue', 'id', "click continue to advance to plot selection");

	# Modal Step 2: Plot Selection
	$t->find_element_ok('trial_design_add_treatment_select', 'id', "find Select Plots for Treatment modal");
	$t->click_ok('//input[@name="add_trial_treatment_select_all"]', 'xpath', "select all plots for treatment");

	$t->click_ok('new_trial_add_treatments_submit', 'id', "submit treatment and close modal");

	# Verify treatment appears in design confirmation section
	$t->find_element_ok('trial_design_confirm_treatments', 'id', "find confirm treatments section");
	my $treatment_found_in_review = wait_until {
		my $text = $t->get_text('trial_design_confirm_treatments', 'id');
		return $text if $text =~ /$treatment_name/;
		return undef;
	};
	ok($treatment_found_in_review, "Verify treatment name appears in confirmed treatments section");

	# Refresh page and verify treatment and design persist without regenerating
	my $treatment_url = $t->driver->get_current_url();
	$t->get_ok($treatment_url, "Refresh page at review step after adding treatment");
	$t->wait_for_network_idle();

	my $treatment_still_present = wait_until {
		my $text = $t->get_text('trial_design_confirm_treatments', 'id');
		return $text if $text =~ /$treatment_name/;
		return undef;
	};
	ok($treatment_still_present, "Verify treatment name persists after page refresh");

	# Confirm and save trial in database
	confirm_and_save($t);
	finish_trial_creation($t);

	# Verify trial exists in tree
	$t->click_ok("refresh_jstree_html", "name", "refresh tree with new trial added");

	$t->click_ok('//div[@id="trial_list"]//ul[@class="jstree-container-ul jstree-children"]//li//i[@class="jstree-icon jstree-ocl"]',
		'xpath', 'find plus button to open tree in test trials');

	$t->click_ok("//a[contains(text(),\"$trial_name\")]", 'xpath', 'Confirm trial exists in database and tree after save');

	# Verify trial exists in database
	my $trial = $f->bcs_schema->resultset('Project::Project')->find({ name => $trial_name });
	ok($trial, "Trial $trial_name was created in database");
});

$t->driver->close();
done_testing();

