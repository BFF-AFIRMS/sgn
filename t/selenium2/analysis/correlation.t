
use strict;

use lib 't/lib';
use Test::More qw| no_plan |;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;
use Selenium::ActionChains;

my $d = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $actions = Selenium::ActionChains->new( driver => $d->driver );

$d->while_logged_in_as("curator", sub {

    my $dataset_name = "Test.Correlation.Dataset";

    # -------------------------------------------------------------------------
    # # Create small dataset using wizard for analysis
    # $d->get_ok("/breeders/search", "navigate to search wizard");

    # # Add trial to dataset
    # $d->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="trials"]', 'xpath', 'select trials');
    # $d->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "Kasese solgs trial")]//preceding-sibling::button' , 'xpath', 'add Kasese solgs trial');

    # # Add traits to dataset
    # $d->click_ok('(//div[@class="panel-heading"]/select)[2]//option[@value="traits"]', 'xpath', 'select traits');
    # $d->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "fresh root weight")]//preceding-sibling::button' , 'xpath', 'add fresh root weight');
    # $d->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "fresh shoot weight")]//preceding-sibling::button' , 'xpath', 'add fresh shoot weight');
    # $d->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "dry matter content")]//preceding-sibling::button' , 'xpath', 'add dry matter content');

    # # Add plots to dataset
    # $d->click_ok('(//div[@class="panel-heading"]/select)[3]//option[@value="plots"]', 'xpath', 'select plots');
    # foreach my $suffix (1000 .. 1009) {
    #     my $plot_name = "KASESE_TP2013_$suffix";
    #     $d->click_ok("(//div[\@class='panel-body'])[3]//a[contains(text(), '$plot_name')]//preceding-sibling::button" , 'xpath', "add $plot_name");
    # }
    # $d->send_keys_ok("wizard-dataset-name", "class", $dataset_name, "enter dataset name");
    # $d->click_ok("wizard-dataset-create", "class", "click create dataset");
    # # TBD: Find better solution than sleep wrappers.
    # sleep(2);

    my $dataset_id = $f->people_schema()->resultset("SpDataset")->find({ name => $dataset_name })->sp_dataset_id();

    # -------------------------------------------------------------------------
    # Run phenotype correlation analysis

    $d->get_ok("/correlation/analysis", "navigate to correlation analysis");
    $d->click_ok("run_correlation_dataset_$dataset_id", "id", "click run correlation");

    # Locate the heatmap plot
    my $heatmap_xpath = "//div[\@id='corr_plot_dataset_$dataset_id']/*[local-name() = 'svg']";
    $d->find_element_ok($heatmap_xpath, "xpath", "locate heatmap");

    # Check axis labels
    my $x_axis = $d->get_attribute("x_axis", "class", "innerHTML", "get y axis");
    like($x_axis, qr/shtwt/, "check x axis shtwt");
    like($x_axis, qr/rtwt/, "check x axis rtwt");
    like($x_axis, qr/dm/, "check x axis dm");

    my $y_axis = $d->get_attribute("y_axis", "class", "innerHTML", "get y axis");
    like($y_axis, qr/shtwt/, "check y axis shtwt");
    like($y_axis, qr/rtwt/, "check y axis rtwt");
    like($y_axis, qr/dm/, "check y axis dm");

    # Move mouse into heatmap to show scatterplot
    my $rect_xpath = $heatmap_xpath . "/*[local-name() = 'g']/*[9]";
    my $elem = $d->driver->find_element($rect_xpath, "xpath");
    $d->driver->mouse_move_to_location(element => $elem);
    $d->driver->click;

    # Locate the scatterplot
    my $div_id = 'corr_plot_dataset_' . $dataset_id . '_scatter_plot';
    my $scatter_plot_xpath = "//div[\@id='$div_id']/*[local-name() = 'svg']";
    $d->find_element_ok($scatter_plot_xpath, "xpath", "locate scatter plot");

    # Check stats
    my $equation = $d->get_attribute("equation", "id", "innerHTML", "get equation");
    like($equation, qr/y = 12.85  -  -0.25x/, "check equation has expected values");
    my $rsquare = $d->get_attribute("rsquare", "id", "innerHTML", "get rsquare");
    like($rsquare, qr/= 0.13/, "check rsquare has expected values");
    my $corr_values = $d->get_attribute("corr_values", "id", "innerHTML", "get corr_values");
    like($corr_values, qr/r = -0.36, p = 0.64/, "check corr_values has expected values");
});

$d->driver->quit();
$f->clean_up_db();
done_testing();
