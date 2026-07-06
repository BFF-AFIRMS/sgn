
use strict;
use warnings;

use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use SGN::Model::Cvterm;

my $d = SGN::Test::WWW::WebDriver->new();
$d->driver->set_timeout('implicit', 5000);

# Set up the DB connection
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;

# -------------------------------------------------------------------------
# Data Setup

# Create some stock properties for us to search for ('country of origin', 'state')
my $test_accession1_stock_id = $schema->resultset("Stock::Stock")->find({uniquename => "test_accession1"})->stock_id();
my $test_accession2_stock_id = $schema->resultset("Stock::Stock")->find({uniquename => "test_accession2"})->stock_id();

my $country_cvterm = SGN::Model::Cvterm->get_cvterm_row($schema, "country of origin", "stock_property")->cvterm_id();
my $state_cvterm = SGN::Model::Cvterm->get_cvterm_row($schema, "state", "stock_property")->cvterm_id();

$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession1_stock_id, type_id => $country_cvterm, value => 'test_country_1'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession2_stock_id, type_id => $country_cvterm, value => 'test_country_2'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession1_stock_id, type_id => $state_cvterm, value => 'test_state_1'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession2_stock_id, type_id => $state_cvterm, value => 'test_state_2'});

my $test_accession3_stock_id = $schema->resultset("Stock::Stock")->find({uniquename => "test_accession3"})->stock_id();
my $test_accession4_stock_id = $schema->resultset("Stock::Stock")->find({uniquename => "test_accession4"})->stock_id();
my $test_accession5_stock_id = $schema->resultset("Stock::Stock")->find({uniquename => "test_accession5"})->stock_id();

my $ploidy_cvterm = SGN::Model::Cvterm->get_cvterm_row($schema, "ploidy_level", "stock_property")->cvterm_id();
my $insertions_cvterm = SGN::Model::Cvterm->get_cvterm_row($schema, "number_of_insertions", "stock_property")->cvterm_id();

$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession1_stock_id, type_id => $ploidy_cvterm, value => '2'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession1_stock_id, type_id => $insertions_cvterm, value => '1'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession2_stock_id, type_id => $ploidy_cvterm, value => '4'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession2_stock_id, type_id => $insertions_cvterm, value => '2'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession3_stock_id, type_id => $ploidy_cvterm, value => '2'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession3_stock_id, type_id => $insertions_cvterm, value => '3'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession4_stock_id, type_id => $ploidy_cvterm, value => '6'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession4_stock_id, type_id => $insertions_cvterm, value => '10'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession5_stock_id, type_id => $ploidy_cvterm, value => '8'});
$schema->resultset("Stock::Stockprop")->find_or_create({stock_id => $test_accession5_stock_id, type_id => $insertions_cvterm, value => '5'});

$d->while_logged_in_as("user", sub {

    # Helper function to run a structured stock search test
    sub run_stock_search_test {
        my %args = @_;
        my $inputs = $args{inputs} || {}; # { id => value }
        my $selects = $args{selects} || {}; # { id => text_of_option }
        my $stockprops = $args{stockprops} || []; # [ { term => 'state', matchtype => 'exactly', value => 'test_state_1' }, ... ]
        my $assertions = $args{assertions} || [];
        my $submit_btn_id = $args{submit_btn_id} || 'submit_stock_search';
        my $reset_btn_id = $args{reset_btn_id} || 'reset_stock_search';

        if ($args{reset_first}) {
            $d->click_ok($reset_btn_id, "id", "Click reset button");
            $d->wait_for_network_idle();
        }

        # Base inputs
        while (my ($id, $val) = each %$inputs) {
            $d->clear_ok($id, "id", "Clear $id");
            $d->send_keys_ok($id, "id", $val, "Input '$val' in $id");
        }

        # Base selects
        while (my ($id, $option_text) = each %$selects) {
            $d->click_ok("//select[\@id='$id']/option[text()='$option_text']", "xpath", "Select '$option_text' in $id");
        }

        # Dynamic Stockprops
        if (@$stockprops) {
            my $adv_content = $d->find_element("advanced_search_panel_content", "id");
            if (!$adv_content->is_displayed()) {
                $d->click_ok("advanced_search_panel_onswitch", "id", "open advanced search");
            }
            my $prop_content = $d->find_element("stock_search_properties_panel_content", "id");
            if (!$prop_content->is_displayed()) {
                $d->click_ok("stock_search_properties_panel_onswitch", "id", "open properties search");
            }

            foreach my $sp (@$stockprops) {
                my $term = $sp->{term};
                my $match = $sp->{matchtype}; # optional
                my $val = $sp->{value};

                $d->click_ok("//select[\@id='editable_stockprop_search_term']/option[text()='$term']", "xpath", "Select stockprop term '$term'");
                $d->click_ok("editable_stockprop_search_add", "id", "Add stockprop '$term'");
                if ($match) {
                     $d->click_ok("//select[\@data-property='$term' and \@name='editable_stockprop_matchtype']/option[\@value='$match']", "xpath", "Select matchtype '$match' for $term");
                }

                if ($match && $match eq 'range') {
                    my @range_vals = ref($val) eq 'ARRAY' ? @$val : ($val);
                    for my $i (0 .. $#range_vals) {
                        my ($min, $max) = split ',', $range_vals[$i];
                        if ($i > 0) {
                            $d->click_ok("//div[\@data-property-group='$term' and \@data-range-index='".($i-1)."']//button[contains(\@class, 'range-add-btn')]", "xpath", "Add another range row for $term");
                        }

                        my $row_xpath = "//div[\@data-property-group='$term' and \@data-range-index='$i']";
                        if (defined $min && $min ne '') {
                            $d->send_keys_ok("$row_xpath//input[\@name='editable_stockprop_range_min']", "xpath", $min, "Set min value for range $i of $term");
                        }
                        if (defined $max && $max ne '') {
                            $d->send_keys_ok("$row_xpath//input[\@name='editable_stockprop_range_max']", "xpath", $max, "Set max value for range $i of $term");
                        }
                    }
                } else {
                    my $input_id = $term;
                    $input_id =~ s/ /_/g;
                    $input_id .= "_input_id";

                    $d->clear_ok($input_id, "id", "Clear stockprop input $input_id");
                    $d->send_keys_ok($input_id, "id", $val, "Input '$val' in stockprop $input_id");
                }
            }
        }

        $d->click_ok($submit_btn_id, "id", "Submit search");
        $d->wait_for_network_idle();

        my $verify = sub {
            my $suffix = shift || "";
            my $res_html = $d->get_attribute("stock_search_results", "id", "innerHTML");
            foreach my $a (@$assertions) {
                my $pattern = $a->{pattern};
                my $expected = $a->{expected};
                my $desc = $a->{desc} . $suffix;
                if ($expected) {
                    ok($res_html =~ /$pattern/, $desc);
                } else {
                    ok($res_html !~ /$pattern/, $desc);
                }
            }
        };

        $verify->();

        # Refresh and verify persistence
        $d->get_ok($d->driver->get_current_url(), "Refresh page to verify search state persistence");
        $d->wait_for_network_idle();
        $verify->(" (after refresh)");
    }

    # -------------------------------------------------------------------------
    # Simple Search

    $d->get_ok('/search/stocks');
    ok(lc($d->driver()->get_page_source()) =~ /search accessions/, "Search page title presence");
    ok(lc($d->driver()->get_page_source()) =~ /project location/, "Search options present");

    run_stock_search_test(
        inputs  => { any_name => 'test_accession1' },
        selects => { stock_type_select => 'accession' },
        assertions => [
            { pattern => qr/test_accession1/, expected => 1, desc => "Verify test_accession1 is in results" }
        ]
    );

    # Extra verification by clicking through to stock page
    $d->click_ok("test_accession1", "partial_link_text", "Click result to verify stock page");
    $d->wait_for_network_idle();

    $d->find_element_ok("Solanum lycopersicum", "link_text", "verify organism");

    # -------------------------------------------------------------------------
    # Search by Stock Properties

    $d->get_ok("/search/stocks");

    # Search for single property ('test_state_1') that only matches only 1 accession
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [ { term => 'state', value => 'test_state_1' } ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 is in results" },
            { pattern => qr/test_accession2/, expected => 0, desc => "verify test_accession2 is not in results" }
        ]
    );

    # Search for single property ('test_state') that only matches 2 accessions
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [ { term => 'state', value => 'test_state' } ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 is in results" },
            { pattern => qr/test_accession2/, expected => 1, desc => "verify test_accession2 is in results" }
        ]
    );

    # Search for multiple properties (state, country of origin) that only matches 1 accession
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [
            { term => 'state', value => 'test_state_1' },
            { term => 'country of origin', value => 'test_country_1' }
        ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 is in results" },
            { pattern => qr/test_accession2/, expected => 0, desc => "verify test_accession2 is not in results" }
        ]
    );

    # Search for multiple properties (state, country of origin) that only matches 2 accessions
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [
            { term => 'state', value => 'test_state' },
            { term => 'country of origin', value => 'test_country' }
        ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 is in results" },
            { pattern => qr/test_accession2/, expected => 1, desc => "verify test_accession2 is in results" }
        ]
    );

    # Search for 'one of'
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [ { term => 'state', matchtype => 'one of', value => 'test_state_1,test_state_2' } ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 is in results" },
            { pattern => qr/test_accession2/, expected => 1, desc => "verify test_accession2 is in results" }
        ]
    );

    # -------------------------------------------------------------------------
    # Search by Stock Property Numeric Ranges

    # 1. One prop with a single range (ploidy 2 to 4)
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [ { term => 'ploidy_level', matchtype => 'range', value => '2,4' } ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 (ploidy 2) is in results" },
            { pattern => qr/test_accession2/, expected => 1, desc => "verify test_accession2 (ploidy 4) is in results" },
            { pattern => qr/test_accession3/, expected => 1, desc => "verify test_accession3 (ploidy 2) is in results" },
            { pattern => qr/test_accession4/, expected => 0, desc => "verify test_accession4 (ploidy 6) is not in results" },
            { pattern => qr/test_accession5/, expected => 0, desc => "verify test_accession5 (ploidy 8) is not in results" }
        ]
    );

    # 2. One prop with multiple ranges (ploidy exactly 2 OR between 6 and 8)
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [ { term => 'ploidy_level', matchtype => 'range', value => ['2,2', '6,8'] } ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 (ploidy 2) is in results" },
            { pattern => qr/test_accession2/, expected => 0, desc => "verify test_accession2 (ploidy 4) is excluded" },
            { pattern => qr/test_accession3/, expected => 1, desc => "verify test_accession3 (ploidy 2) is in results" },
            { pattern => qr/test_accession4/, expected => 1, desc => "verify test_accession4 (ploidy 6) is in results" },
            { pattern => qr/test_accession5/, expected => 1, desc => "verify test_accession5 (ploidy 8) is in results" }
        ]
    );

    # 3. 2 props with a single range each (ploidy 2-4 AND insertions 3-5)
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [
            { term => 'ploidy_level', matchtype => 'range', value => '2,4' },
            { term => 'number_of_insertions', matchtype => 'range', value => '3,5' }
        ],
        assertions  => [
            { pattern => qr/test_accession3/, expected => 1, desc => "verify test_accession3 (2, 3) is in results" },
            { pattern => qr/test_accession1/, expected => 0, desc => "verify test_accession1 (2, 1) is excluded" },
            { pattern => qr/test_accession2/, expected => 0, desc => "verify test_accession2 (4, 2) is excluded" },
            { pattern => qr/test_accession4/, expected => 0, desc => "verify test_accession4 (6, 10) is excluded" },
            { pattern => qr/test_accession5/, expected => 0, desc => "verify test_accession5 (8, 5) is excluded" }
        ]
    );

    # 4. 2 props with 1 single range, 1 multiple range (ploidy 2-8 AND insertions 1 OR 10)
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [
            { term => 'ploidy_level', matchtype => 'range', value => '2,8' },
            { term => 'number_of_insertions', matchtype => 'range', value => ['1,1', '10,10'] }
        ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 (2, 1) is in results" },
            { pattern => qr/test_accession4/, expected => 1, desc => "verify test_accession4 (6, 10) is in results" },
            { pattern => qr/test_accession2/, expected => 0, desc => "verify test_accession2 (4, 2) is excluded" },
            { pattern => qr/test_accession3/, expected => 0, desc => "verify test_accession3 (2, 3) is excluded" },
            { pattern => qr/test_accession5/, expected => 0, desc => "verify test_accession5 (8, 5) is excluded" }
        ]
    );

    # 5. 2 props each with multiple ranges (ploidy 2 OR 8 AND insertions 1 OR 5)
    run_stock_search_test(
        reset_first => 1,
        stockprops  => [
            { term => 'ploidy_level', matchtype => 'range', value => ['2,2', '8,8'] },
            { term => 'number_of_insertions', matchtype => 'range', value => ['1,1', '5,5'] }
        ],
        assertions  => [
            { pattern => qr/test_accession1/, expected => 1, desc => "verify test_accession1 (2, 1) is in results" },
            { pattern => qr/test_accession5/, expected => 1, desc => "verify test_accession5 (8, 5) is in results" },
            { pattern => qr/test_accession2/, expected => 0, desc => "verify test_accession2 is excluded" },
            { pattern => qr/test_accession3/, expected => 0, desc => "verify test_accession3 is excluded" },
            { pattern => qr/test_accession4/, expected => 0, desc => "verify test_accession4 is excluded" }
        ]
    );

});

# Cleanup
$d->wait_for_network_idle();
$d->driver->quit();
$f->clean_up_db();
done_testing();
