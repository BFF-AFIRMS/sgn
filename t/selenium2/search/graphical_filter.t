use strict;
use warnings;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;

my $t = SGN::Test::WWW::WebDriver->new();

$t->while_logged_in_as('user', sub {

    $t->get_ok('/search/stocks', 'navigate to search stocks');
    $t->click_ok('//select[@id="any_name_matchtype"]/option[@value="contains"]', 'xpath', 'select stock name contains');
    $t->send_keys_ok('any_name', 'id', 'UG1200', 'enter name prefix UG1200');
    $t->click_ok('submit_stock_search', 'id', 'click Search');
    $t->click_ok('stock_search_graphical_filter_onswitch', 'id', 'expand graphical filter section');

    # Check that column order is sorted correctly
    my $graphical_filter_columns = $t->get_attribute_ok(
        '//table[@aria-describedby="stock_search_graphical_filter_results_div_info"]/thead/tr',
        'xpath',
        'innerHTML',
        "find content of graphical filter table"
    );
    my $expected_order = "Accession.*Count.*dry matter content percentage.*fresh root weight.*fresh shoot weight measurement in kg.*harvest index variable";
    like($graphical_filter_columns, qr/$expected_order/, 'graphical filter columns match expected order');

    # Check that row 1 has correct values
    my $graphical_filter_row = $t->get_attribute_ok(
        '//table[@id="stock_search_graphical_filter_results_div"]/tbody/tr[1]',
        'xpath',
        'innerHTML',
        "find content of graphical filter table"
    ); 
    my $expected_row = "UG120001.*6.*14.049999.*6.583333.*8.5.*0.45";
    like($graphical_filter_row, qr/$expected_row/, 'graphical filter row 1 match expected content');
});

$t->driver->quit();
done_testing();
