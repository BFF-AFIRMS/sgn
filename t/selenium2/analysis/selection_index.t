use strict;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;

my $d = SGN::Test::WWW::WebDriver->new();

$d->while_logged_in_as("submitter", sub {
    $d->get_ok('/selection/index');

    # Wait for the select trial box to be visible
    $d->find_element_ok('select_trial_for_selection_index', 'id', 'find select trial dropdown');

    # Select the trial
    $d->click_ok('//select[@id="select_trial_for_selection_index"]/option[text()="Kasese solgs trial"]', 'xpath', 'select Kasese solgs trial');

    # Wait for AJAX to populate traits list
    $d->wait_for_network_idle();

    # Select a trait
    $d->click_ok('//select[@id="trait_list"]/option[text()="dry matter content percentage"]', 'xpath', 'select dry matter trait');

    # Verify that the trait was added to the table
    $d->find_element_ok('trait_table', 'id', 'find trait table');

    # Click calculate rankings
    $d->click_ok('calculate_rankings', 'id', 'click calculate rankings button');

    # Wait for calculation to finish
    $d->wait_for_network_idle();

    # Verify rankings table content
    my $weighted_html = $d->get_attribute_ok('weighted_values_table', 'id', 'innerHTML', 'get weighted values table content');
    ok($weighted_html =~ /UG12/, "verify accession is in rankings table");

    # Test saving the formula
    $d->send_keys_ok('save_sin_name', 'id', 'test_sin_formula', 'enter name for SIN formula');
    $d->click_ok('save_sin', 'id', 'click save button');

    # Accept the alert pop-up
    $d->accept_alert_ok('accept saved SIN formula alert');

    # Verify that the saved formula is in the saved formulas dropdown
    $d->click_ok('sin_list_list_refresh', 'id', 'click refresh button for SIN formulas');
    $d->wait_for_network_idle();
    $d->find_element_ok('//select[@id="sin_list_list_select"]/option[text()="test_sin_formula"]', 'xpath', 'verify saved formula is in dropdown');
});

$d->driver->quit();
done_testing();
