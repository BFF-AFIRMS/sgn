use strict;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use CXGN::BreederSearch;
use CXGN::Onto;

my $d = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;

my $dry_matter_cvterm = $schema->resultset("Cv::Cvterm")->find({ name => "dry matter content percentage" });
my $dry_matter_id = $dry_matter_cvterm->cvterm_id();

my $fresh_root_cvterm = $schema->resultset("Cv::Cvterm")->find({ name => "fresh root weight" });
my $fresh_root_id = $fresh_root_cvterm->cvterm_id();

# Setup a composed trait with multiple pipe delimiters using the standard Onto library
my $onto = CXGN::Onto->new({ schema => $schema });
my $new_terms = $onto->store_composed_term({
    "composed trait name|CO_334:1234567" => "$dry_matter_id,$fresh_root_id"
}, 'trait');

my $composed_cvterm_id = $new_terms->[0]->[0];
my $composed_cvterm = $schema->resultset("Cv::Cvterm")->find({ cvterm_id => $composed_cvterm_id });

my $trial = $schema->resultset("Project::Project")->find({ name => "Kasese solgs trial" });
my $existing_nd_experiment_phenotype = $schema->resultset("NaturalDiversity::NdExperimentPhenotype")->search(
    {
        'nd_experiment_projects.project_id' => $trial->project_id(),
        'phenotype.observable_id' => $dry_matter_id,
    },
    {
        join => [ 'phenotype', { 'nd_experiment' => 'nd_experiment_projects' } ]
    }
)->first();
my $nd_experiment_id = $existing_nd_experiment_phenotype->nd_experiment_id();

my $phenotype = $schema->resultset("Phenotype::Phenotype")->create({
    observable_id => $composed_cvterm_id,
    cvalue_id => $composed_cvterm_id,
    value => "10.5",
    uniquename => "selenium_test_composed_phenotype_value",
});

$schema->resultset("NaturalDiversity::NdExperimentPhenotype")->create({
    nd_experiment_id => $nd_experiment_id,
    phenotype_id => $phenotype->phenotype_id(),
});

my $bs = CXGN::BreederSearch->new({ dbh => $schema->storage->dbh, dbname => $f->config->{dbname} });
$bs->refresh_matviews(
    $f->config->{dbhost},
    $f->config->{dbname},
    $f->config->{dbuser},
    $f->config->{dbpass},
    'fullview',
    0,
    $f->config->{basepath}
);

$d->while_logged_in_as("submitter", sub {
    $d->get_ok('/selection/index');

    # Wait for the select trial box to be visible
    $d->find_element_ok('select_trial_for_selection_index', 'id', 'find select trial dropdown');

    # Select the trial
    $d->click_ok('//select[@id="select_trial_for_selection_index"]/option[text()="Kasese solgs trial"]', 'xpath', 'select Kasese solgs trial');

    # Wait for AJAX to populate traits list
    $d->wait_for_network_idle();

    # Verify that the full composed trait name is shown in the dropdown (excluding only the last ID part)
    $d->find_element_ok('//select[@id="trait_list"]/option[text()="composed trait name|CO_334:1234567"]', 'xpath', 'verify composed trait is visible with full name');

    # Select the composed trait
    $d->click_ok('//select[@id="trait_list"]/option[text()="composed trait name|CO_334:1234567"]', 'xpath', 'select composed trait');

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

$f->clean_up_db();
$d->driver->quit();
done_testing();
