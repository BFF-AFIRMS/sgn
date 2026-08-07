use strict;

use lib 't/lib';

use Test::More;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;
use Selenium::Waiter qw(wait_until);
use Try::Tiny;

my $d = SGN::Test::WWW::WebDriver->new();

my $f = SGN::Test::Fixture->new();
my $dbh = $f->dbh();

$d->while_logged_in_as("submitter", sub {

    # -------------------------------------------------------------------------
    # Tool Compatibility for Trials + Traits + Plots

    my $dataset_name = "Trials.Traits.Plots.ToolCompatibility";

    # Create small dataset using wizard for analysis
    $d->get_ok("/breeders/search", "navigate to search wizard");
    # Trials
    $d->click_ok('(//div[@class="panel-heading"]/select)[1]//option[@value="trials"]', 'xpath', 'select trials');
    $d->click_ok('(//div[@class="panel-body"])[1]//a[contains(text(), "Kasese solgs trial")]//preceding-sibling::button' , 'xpath', 'add Kasese solgs trial');
    # Traits
    $d->click_ok('(//div[@class="panel-heading"]/select)[2]//option[@value="traits"]', 'xpath', 'select traits');
    $d->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "fresh shoot weight")]//preceding-sibling::button' , 'xpath', 'add fresh shoot weight');
    $d->click_ok('(//div[@class="panel-body"])[2]//a[contains(text(), "dry matter content")]//preceding-sibling::button' , 'xpath', 'add dry matter content');
    # Plots (Add 10 to dataset: KASESE_TP2013_1000 - KASESE_TP2013_1009)
    $d->click_ok('(//div[@class="panel-heading"]/select)[3]//option[@value="plots"]', 'xpath', 'select plots');
    foreach my $suffix (1000 .. 1009) {
        my $plot_name = "KASESE_TP2013_$suffix";
        $d->click_ok("(//div[\@class='panel-body'])[3]//a[contains(text(), '$plot_name')]//preceding-sibling::button" , 'xpath', "add $plot_name");
    }
    $d->send_keys_ok("wizard-dataset-name", "class", "$dataset_name", "enter dataset name");
    $d->click_ok("wizard-dataset-create", "class", "click create dataset");
    $d->wait_for_alert_appear();
    $d->accept_alert_ok("accept dataset summary alert");
    my $dataset_id = $f->people_schema()->resultset("SpDataset")->find({ name => $dataset_name })->sp_dataset_id();

    # Check tool compatibility
    ok(wait_for_tool_compatibility($dataset_id), "locate tool compatibility results");
    $d->find_element_ok("//b[contains(text(), 'Boxplotter')]/span[contains(\@class, 'glyphicon-warning')]", "xpath", "boxplotter status is warning");
    $d->find_element_ok("//b[contains(text(), 'Correlation')]/span[contains(\@class, 'glyphicon-warning')]", "xpath", "correlation status is warning");
    $d->find_element_ok("//b[contains(text(), 'Clustering')]/span[contains(\@class, 'glyphicon-warning')]", "xpath", "clustering status is warning");
    $d->find_element_ok("//b[contains(text(), 'GWAS')]/span[contains(\@class, 'glyphicon-remove')]", "xpath", "gwas status is fail");
    $d->find_element_ok("//b[contains(text(), 'Heritability')]/span[contains(\@class, 'glyphicon-remove')]", "xpath", "heritability status is fail");
    $d->find_element_ok("//b[contains(text(), 'Kinship & Inbreeding')]/span[contains(\@class, 'glyphicon-warning')]", "xpath", "kinship and inbreeding status is warning");
    $d->find_element_ok("//b[contains(text(), 'Mixed Models')]/span[contains(\@class, 'glyphicon-warning')]", "xpath", "mixed models status is warning");
    $d->find_element_ok("//b[contains(text(), 'NIRS')]/span[contains(\@class, 'glyphicon-remove')]", "xpath", "nirs status is fail");
    $d->find_element_ok("//b[contains(text(), 'Population Structure')]/span[contains(\@class, 'glyphicon-warning')]", "xpath", "population structure status is warning");
    $d->find_element_ok("//b[contains(text(), 'Stability')]/span[contains(\@class, 'glyphicon-remove')]", "xpath", "stability status is fail");
});

$d->driver->close();
$f->clean_up_db();
done_testing();

sub wait_for_tool_compatibility {
    my ($dataset_id) = @_;
    my $timeout = $d->_extract_timeout();

    my $ok = wait_until {
        my $tool_compatibility;

        try {
            $d->get_ok("/dataset/$dataset_id", "navigate to dataset page");
            $tool_compatibility = $d->get_attribute_ok("predicted-tool-compatibility", "id", "innerHTML", "locate predicted tool compatibility");
        } catch {
            $tool_compatibility = undef;
        };

        return $tool_compatibility =~ /Correlation/
    }  timeout => $timeout;
    return $ok;
}


