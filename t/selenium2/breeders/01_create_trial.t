
use strict;

use lib 't/lib';

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use Shared::AddTrial qw/
    open_add_trial
    fill_trial_info
    fill_design_info
    fill_trial_linkage
    fill_field_map_info
    fill_plot_naming
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
		trial_name      => sprintf("Trial_selenium_%d", int(rand(1000))),
		planting_date   => "20150131",
		plot_width      => "10",
		plot_length     => "10",
		field_size      => "5",
		plants_per_plot => "10",
		description     => "Test trial selenium / description for field test",
	);

	fill_design_info($t,
		design_type => 'CRD',
		stock_list  => $acc_list_id,
		checks_list => 4,
		rep_count   => "1",
	);

	fill_trial_linkage($t,
		trial_sourced     => 'no',
		will_be_genotyped => 'no',
		will_be_crossed   => 'no',
	);

	fill_field_map_info($t, rows => "1", layout => 'zigzag');

	fill_plot_naming($t, prefix => "prefix_sel_", start_number => "101", increment => "2");

	continue_to_review($t);

	# Redo the randomization and confirm the review screen updates.
	$t->click_ok('redo_trial_layout_button', 'id', "find redo randomization and click button");
	$t->wait_for_working_dialog();

	# TEST PAGE REFRESH AND DRAFT RESTORATION ON THE REVIEW STEP
	my $current_url = $t->driver->get_current_url();
	ok($current_url =~ /draft_id=/, "URL contains draft_id parameter");

	$t->get_ok($current_url, "Refresh page at review design step with draft_id");
	$t->wait_for_network_idle();
	$t->wait_for_working_dialog();

	$t->find_element_ok('trial_design_information', 'id', "Verify review design section is restored after refresh");
	my $design_info_text = $t->get_text('trial_design_information', 'id');
	ok($design_info_text =~ /Completely Randomized Design/, "Verify restored design type in trial design info");
	ok($design_info_text =~ /Number of locations/, "Verify restored locations in trial design info");
	ok($design_info_text =~ /Number of accessions/, "Verify restored accessions in trial design info");
	ok($design_info_text =~ /Number of reps/, "Verify restored reps in trial design info");

	confirm_and_save($t);
	finish_trial_creation($t);

	$t->click_ok("refresh_jstree_html", "name", "refresh tree with new trial added");

	$t->click_ok('//div[@id="trial_list"]//ul[@class="jstree-container-ul jstree-children"]//li//i[@class="jstree-icon jstree-ocl"]',
		'xpath', 'find a plus button to open a tree in test trails');

	$t->click_ok("//a[contains(text(),\"$trial_name\")]", 'xpath', 'Confirm if trail exists in database and new tree after refresh');
});


$t->driver->close();
done_testing();