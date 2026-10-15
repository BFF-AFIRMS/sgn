
use strict;

use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;

use Selenium::Waiter qw(wait_until);

my $d = SGN::Test::WWW::WebDriver->new();

$d->while_logged_in_as('submitter', sub {
    $d->get_ok('/tools');  # something else than the index page, which has a dialog that messes up the test

    # Create a new trail list for comparison test
    $d->click_ok("navbar_lists", "id", "find navbar list button");

    $d->send_keys_ok("add_list_input", "id", "new_trial_list", "find add list input");

    $d->click_ok("add_list_button", "id", "click add list button");

    $d->send_keys_ok(
         '//div[@id="private_list_data_table_wrapper"]//input[@type="search"]',
         "xpath",
         "new_trial_list",
         "find search in table and find 'new_trial_list'");

    $d->click_ok("view_list_new_trial_list", "id", "view new list test");

    $d->send_keys_ok("updateListDescField", "id", "new_trial_list_description", "add trial test list description");

    $d->click_ok("updateListDescButton", "id", "click update List Desc Button");
    $d->accept_alert_ok("accept update list description alert");
    $d->wait_for_alert_dismissed();

    my $trials_list = "Kasese solgs trial\ntrial2 NaCRRI";
    $d->set_value_ok("dialog_add_list_item", "id", "add trial test list", $trials_list);

    sleep(1); # Determined empirically; needed so the following button click will register

    $d->click_ok("dialog_add_list_item_button", "id", "click dialog_add_list_item_button test");
    wait_until { 
        my @rows = $d->driver->find_elements('//table[@id="list_item_dialog_datatable"]/tbody/tr', "xpath");
        return scalar @rows == 2;
    };

    $d->click_ok("type_select", "id", "click select of type list");
    $d->click_ok(
        '//select[@id="type_select"]/option[@name="trials"]',
        "xpath",
        "select 'trials' as type list");

    $d->click_ok("list_item_dialog_validate", "id", "find and click validate 'trails' type list");
    $d->accept_alert_ok("accept validation alert");

    $d->wait_for_working_dialog();

    $d->click_ok("close_list_item_dialog", "id", "click close list item dialog");

    $d->click_ok("close_list_dialog_button", "id", "click close dialog button");

    # Change page to trial comparison
    $d->get_ok("/tools/trial/comparison/list");

    $d->click_ok("trials_list_select", "id", "click trials select");

    $d->click_ok(
        '//select[@id="trials_list_select"]/option[contains(text(), "new_trial_list")]',
        "xpath",
        "select 'new_trial_list' as list");
    
    $d->wait_for_spinner("trials-loading-spinner", "id");

    $d->click_ok("unit_select", "id", "click select plot observation level");
    
    $d->click_ok(
        '//select[@id="unit_select"]/option[@value="plot"]',
        "xpath",
        "select plot observation level");
    
    $d->wait_for_spinner("trials-loading-spinner", "id");

    $d->click_ok("trait_select", "id", "click trait select");
    $d->click_ok(
        '//select[@id="trait_select"]/option[contains(text(), "dry matter content percentage|CO_334:0000092")]',
        "xpath",
        "select 'dry matter content percentage' as trait");
    
    # Check trial names on axis of created plot
    my $plot_view = $d->get_attribute_ok(
        '//div[@id="tc-grid"]',
        'xpath',
        'innerHTML',
        'find a content of plot');

    ok($plot_view =~ /trial2 NaCRRI/, "Verify if 'trial2 NaCRRI' on pedigree panel");
    ok($plot_view =~ /Kasese solgs trial/, "Verify if 'Kasese solgs trial' on pedigree panel");

});

$d->driver->close();
done_testing();
