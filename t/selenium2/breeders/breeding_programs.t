use lib 't/lib';

use Test::More;

use SGN::Test::WWW::WebDriver;


# The program table is rendered client side, so its per-row controls are
# targeted by the row's content instead of the anchor ids of the old table.
sub row_actions_button {
    my $name = shift;
    return "//tr[td[contains(normalize-space(.), '$name')]]//button[\@aria-label='Row actions']";
}

sub row_action {
    my ($name, $action) = @_;
    return "//tr[td[contains(normalize-space(.), '$name')]]//div[\@role='menu']//button[normalize-space(.)='$action']";
}

my $t = SGN::Test::WWW::WebDriver->new();

$t->while_logged_in_as("curator", sub {
    $t->get_ok('/breeders/manage_programs');

    $t->click_ok('new_breeding_program_link', 'id', 'new breeding program link');

    $t->send_keys_ok('store_breeding_program_name', 'id', 'WEBTEST', 'find store breeding program name input');

    $t->send_keys_ok('store_breeding_program_desc', 'id', 'Test description.', 'find store breeding program description input');

    $t->click_ok('store_breeding_program_submit', 'id', 'find store breeding program button');

    # Storing reloads the page once the request completes; the banner on the
    # reloaded page is the confirmation the old alert used to be.
    $t->find_element_ok('breeding_program_success_banner', 'id', 'find breeding program success banner');

    $t->get_ok('/breeders/manage_programs');

    $t->find_element_ok(row_actions_button('WEBTEST'), 'xpath', 'find breeding program row actions menu');

    ok($t->driver->get_page_source() =~ m/WEBTEST/, "breeding program addition successful");

    $t->click_ok(row_actions_button('WEBTEST'), 'xpath', 'open breeding program row actions menu');

    $t->click_ok(row_action('WEBTEST', 'Delete'), 'xpath', 'click breeding program delete action');

    $t->accept_alert_ok('accept alert for breeding program deletion');
    sleep(2); # Waiting for the deletion to complete; no active requests to watch clientside

    $t->get_ok('/breeders/manage_programs');

    # Wait for the table to load by checking for the add link again, then verify WEBTEST is gone
    $t->find_element_ok('new_breeding_program_link', 'id', 'wait for page to load');

    ok($t->driver->get_page_source() !~ m/WEBTEST/, "breeding program deletion successful");
});

$t->driver()->close();
done_testing();
