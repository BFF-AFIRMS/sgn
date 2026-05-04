
use strict;

use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use Selenium::Firefox;
use Selenium::Firefox::Profile;

my $profile = Selenium::Firefox::Profile->new;
$profile->set_preference( 'browser.download.folderList', 2 ); # Use custom download folder
$profile->set_preference( 'browser.download.dir', '/tmp/download.txt' );
$profile->set_preference( 'browser.download.manager.showWhenStarting', 0 );
$profile->set_preference( 'browser.helperApps.neverAsk.saveToDisk', 'application/octet-stream,text/csv,application/zip,text/plain' );

my $driver = Selenium::Remote::Driver->new(firefox_profile => $profile, base_url => $ENV{SGN_TEST_SERVER}, remote_server_addr => $ENV{SGN_REMOTE_SERVER_ADDR} || 'localhost');

my $d = SGN::Test::WWW::WebDriver->new();
$d->driver($driver);

$d->while_logged_in_as("submitter", sub {
    $d->get_ok("/about/index.pl", "get root url test");

    my $out = $d->find_element_ok("lists_link", "name", "find lists_link")->click();

    # Revert to original sorting: by list name, ascending
    $d->find_element_ok("(//table[\@id='private_list_data_table']/thead/tr/th)[1]", "xpath", "Sort table by List Name")->click();
    $d->find_element_ok("list_select_checkbox_808", "id", "checkbox select list")->click();
    $d->find_element_ok("list_select_checkbox_810", "id", "checkbox select list")->click();
    $d->find_element_ok("make_public_selected_list_group", "id", "make public selected list group")->click();
    $d->accept_alert_ok();
    $d->find_element_ok("view_public_lists_button", "id", "view public lists")->click();
    $d->find_element_ok("view_public_list_johndoe_1_private", "id", "check view public lists");
    $d->find_element_ok("close_public_list_item_dialog", "id", "close public lists")->click();
    $d->find_element_ok("list_select_checkbox_808", "id", "checkbox select list")->click();
    $d->find_element_ok("list_select_checkbox_810", "id", "checkbox select list")->click();
    $d->find_element_ok("make_private_selected_list_group", "id", "make private selected list group")->click();
    $d->accept_alert_ok();

    ## Combine two lists using union
    $d->find_element_ok("list_select_checkbox_808", "id", "checkbox select list 808")->click();
    $d->find_element_ok("list_select_checkbox_810", "id", "checkbox select list 810")->click();
    $d->find_element_ok("new_combined_list_name", "id", "name selected list group - union")->send_keys("combined_list_union");
    $d->find_element_ok("combine_selected_list_group_union", "id", "combine selected list group - union")->click();

    $d->accept_alert_ok();
    ok($d->driver->get_alert_text() =~ m/Added 4 items to the new List combined_list_union/i, 'created selected list group - union');
    $d->accept_alert_ok();

    $d->find_element_ok("view_list_combined_list_union", "id", "check view combined list - union");

    ## Combine two lists using intersection
    $d->find_element_ok("list_select_checkbox_808", "id", "checkbox select list 808")->click();
    $d->find_element_ok("list_select_checkbox_4", "id", "checkbox select list 4")->click();
    $d->find_element_ok("new_combined_list_name", "id", "name selected list group - intersection")->send_keys("combined_list_intersection");
    $d->find_element_ok("combine_selected_list_group_intersection", "id", "combine selected list group - intersection")->click();
    $d->accept_alert_ok();

    # Accept alert about mismatched list types (one list doesn't have it's type set)
    $d->accept_alert_ok();
    ok($d->driver->get_alert_text() =~ m/Added 2 items to the new List combined_list_intersection/i, 'created selected list group - intersection');
    $d->accept_alert_ok();

    $d->find_element_ok("view_list_combined_list_intersection", "id", "check view combined list - intersection");

    # Compare two lists
    $d->find_element_ok("list_select_checkbox_808", "id", "checkbox select list 808")->click();
    $d->find_element_ok("list_select_checkbox_810", "id", "checkbox select list 810")->click();
    $d->find_element_ok("compare_selected_list_group", "id", "compare selected list group")->click();
    $d->find_element_ok("download_comparison_column", "id", "find download comparison column button")->click();
    $d->find_element_ok("close_list_comparison_modal", "id", "find close comparison dialog button")->click();

    ## Delete list group
    $d->find_element_ok("delete_selected_list_group", "id", "delete selected list group")->click();
    $d->accept_alert_ok();
    $d->find_element_ok("close_list_dialog_button", "id", "find close dialog button")->click();
});

$d->driver->close();
done_testing();

