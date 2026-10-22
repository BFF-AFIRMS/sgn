
use strict;

use lib 't/lib';

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use Selenium::Waiter qw(wait_until);

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

$t->while_logged_in_as("submitter", sub {
	$t->get_ok('/breeders/trial/create');

	# SCREEN 1 /Intro/
	$t->click_ok('next_step_intro_button', 'id', 'go to next screen - Intro');

	# SCREEN 2 /Trial information/
	$t->click_ok('select_breeding_program', 'id', 'find breeding program select and click "test"');
	$t->click_ok('//select[@id="select_breeding_program"]/option[@value="test"]', 'xpath', "Select 'test' as value for breeding program");

	$t->click_ok('//select[@id="add_project_location"]/option[@value="test_location"]',
		'xpath',
		"Select 'test_location' as value for project location");

	my $trial_name = sprintf("Trial_treatment_selenium_%d", int(rand(10000)));
	$t->send_keys_ok('new_trial_name', 'id', $trial_name, "find new trial name input box");

	$t->click_ok('add_project_type', 'id', "find project type select list");
	$t->click_ok('//select[@id="add_project_type"]/option[@title="misc_trial"]', 'xpath', "Select 'misc_trial' as value for project type");

	$t->click_ok('add_project_year', 'id', "find trial year select list");
	$t->click_ok('//select[@id="add_project_year"]/option[@value="2015"]', 'xpath', "Select '2015' as value for year");

	$t->send_keys_ok('add_project_description', 'id', "Test trial with field treatments selenium", "find project description input box");

	$t->find_element_ok('select_stock_type', 'id', "find trial stock type select input");
	$t->click_ok('//select[@id="select_stock_type"]/option[@value="accession"]', 'xpath', "find accession value for stock type");

	$t->click_ok('select_design_method', 'id', "find field trial design input");
	$t->click_ok('//select[@id="select_design_method"]/option[@value="CRD"]', 'xpath', "find randomized method of design");

	# SCREEN 3 /Design Information/
	$t->send_keys_ok('rep_count', 'id', "1", "find trial replicates count input");

	$t->click_ok('show_list_of_accession_section', 'id', "find accessions to include select");
	$t->click_ok('//option[text()="accessions2add"]', "xpath", "find accession value for list");

	$t->click_ok('crbd_list_of_checks_section_list_select', 'id', "find checks to include select");
	$t->click_ok('//select[@id="crbd_list_of_checks_section_list_select"]//option[@value ="4"]', "xpath", "find checks for list");

	# Advance to Review Screen
	sleep(1);
	$t->click_ok('new_trial_submit', 'id', 'go to next screen - Review design');
	$t->wait_for_working_dialog();

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
	$t->click_ok('new_trial_confirm_submit', 'id', "confirm and save trial");
	$t->wait_for_working_dialog();
	$t->wait_for_network_idle();

	# SCREEN 5 /Complete/
	$t->click_ok('//div[@class="panel-body"]//div[@class="workflow-complete-message workflow-message-show"]//button[@id="create_trial_success_complete_button"]',
		'xpath', 'click complete button on last screen');
	$t->wait_for_network_idle();

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

