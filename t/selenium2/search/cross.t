use strict;
use warnings;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use SGN::Model::Cvterm;
use LWP::UserAgent;
use Selenium::Waiter qw(wait_until);
use Selenium::Remote::WDKeys 'KEYS';

my $d = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;

sub get_cvterm_id {
    my ($name) = @_;
    my $term ||= $schema->resultset("Cv::Cvterm")->search({ 'me.name' => $name })->first;
    die "Required CVTerm '$name' not found in database fixture" unless $term;
    return $term->cvterm_id();
}

# Resolve CVTerm IDs for stocks and relationships
my $breeding_program_type_id = get_cvterm_id('breeding_program');
my $crossing_trial_type_id = get_cvterm_id('crossing_trial');
my $bp_trial_rel_type_id = get_cvterm_id('breeding_program_trial_relationship');
my $cross_experiment_type_id = get_cvterm_id('cross_experiment');
my $field_layout_type_id = get_cvterm_id('field_layout');
my $project_year_type_id = get_cvterm_id('project year');
my $project_location_type_id = get_cvterm_id('project location');

my $accession_type_id = get_cvterm_id('accession');
my $cross_type_id = get_cvterm_id('cross');
my $plot_type_id = get_cvterm_id('plot');
my $population_type_id = get_cvterm_id('population');
my $female_parent_rel_type_id = get_cvterm_id('female_parent');
my $male_parent_rel_type_id = get_cvterm_id('male_parent');
my $offspring_of_rel_type_id = get_cvterm_id('offspring_of');
my $plot_of_rel_type_id = get_cvterm_id('plot_of');

# Create Breeding Program and Crossing Trial
my $breeding_program = $schema->resultset("Project::Project")->find_or_create({ name => 'Test Breeding Program', description => 'Test Breeding Program', type_id => $breeding_program_type_id });
my $crossing_trial = $schema->resultset("Project::Project")->find_or_create({ name => 'Test Crossing Trial', description => 'Test Crossing Trial', type_id => $crossing_trial_type_id });
$schema->resultset("Project::ProjectRelationship")->find_or_create({ subject_project_id => $crossing_trial->project_id, object_project_id => $breeding_program->project_id, type_id => $bp_trial_rel_type_id });

my $geolocation = $schema->resultset("NaturalDiversity::NdGeolocation")->first();
my $nd_geolocation_id = $geolocation ? $geolocation->nd_geolocation_id() : 1;

# Set trial metadata (year and location are required for many Breedbase search logic and views)
$schema->resultset("Project::Projectprop")->find_or_create({ project_id => $crossing_trial->project_id, type_id => $project_year_type_id, value => '2024' });
$schema->resultset("Project::Projectprop")->find_or_create({ project_id => $crossing_trial->project_id, type_id => $project_location_type_id, value => $nd_geolocation_id });

# Lookup parents
my $female_parent_stock = $schema->resultset("Stock::Stock")->find({ uniquename => 'TestAccession1', type_id => $accession_type_id })
    or die "Required female parent 'TestAccession1' not found in database fixture";
my $organism_id = $female_parent_stock->organism_id();

my %parents;
foreach my $name ('TestAccession1', 'TestAccession2', 'TestAccession3', 'TestAccession4', 'TestPopulation1', 'TestPopulation2') {
    my $type_id = ($name =~ /Population/) ? $population_type_id : $accession_type_id;
    my $p_stock = $schema->resultset("Stock::Stock")->find({
        uniquename => $name,
        type_id => $type_id,
    }) or die "Required parent stock '$name' not found in database fixture";
    $parents{$name} = $p_stock->stock_id;
}

# Define the crosses to create
my @crosses_to_create = (
    { name => 'TestCross1', female => 'TestAccession1', male => 'TestAccession2', type => 'biparental' },
    { name => 'TestCross2', female => 'TestAccession1', male => 'TestAccession3', type => 'biparental' },
    { name => 'TestCross3', female => 'TestAccession1', male => 'TestAccession4', type => 'biparental' },
    { name => 'TestCross4', female => 'TestAccession1', male => 'TestAccession1', type => 'self' },
    { name => 'TestCross5', female => 'TestAccession1', male => 'TestPopulation1', type => 'open' },
    { name => 'TestCross6', female => 'TestAccession1', male => 'TestPopulation2', type => 'open' },
);

foreach my $c_info (@crosses_to_create) {
    my $cross_stock = $schema->resultset("Stock::Stock")->find_or_create({
        uniquename => $c_info->{name},
        name => $c_info->{name},
        type_id => $cross_type_id,
        organism_id => $organism_id,
    });

    # Link cross to experiment
    my $nd_experiment = $schema->resultset("NaturalDiversity::NdExperiment")->create({ nd_geolocation_id => $nd_geolocation_id, type_id => $cross_experiment_type_id });
    $nd_experiment->create_related('nd_experiment_stocks', { stock_id => $cross_stock->stock_id, type_id => $cross_experiment_type_id });
    $nd_experiment->create_related('nd_experiment_projects', { project_id => $crossing_trial->project_id });

    $schema->resultset("Stock::StockRelationship")->find_or_create({ subject_id => $parents{$c_info->{female}}, object_id => $cross_stock->stock_id, type_id => $female_parent_rel_type_id, value => $c_info->{type} });
    $schema->resultset("Stock::StockRelationship")->find_or_create({ subject_id => $parents{$c_info->{male}}, object_id => $cross_stock->stock_id, type_id => $male_parent_rel_type_id }) if $c_info->{male};

    # Create one or more progeny accessions for each mock cross
    my @progeny_suffixes = ('_progeny');
    push @progeny_suffixes, '_progeny_sibling' if $c_info->{name} eq 'TestCross1'; # Add a second progeny to TestCross1

    foreach my $suffix (@progeny_suffixes) {
        my $progeny_name = $c_info->{name} . $suffix;
        my $progeny_stock = $schema->resultset("Stock::Stock")->find_or_create({
            uniquename => $progeny_name,
            name => $progeny_name,
            type_id => $accession_type_id,
            organism_id => $organism_id,
        });

        # Create a plot for the progeny and link it to the trial (required for materialized views used in many progeny grids)
        my $progeny_plot_name = $progeny_name . "_plot";
        my $progeny_plot = $schema->resultset("Stock::Stock")->find_or_create({
            uniquename => $progeny_plot_name,
            name => $progeny_plot_name,
            type_id => $plot_type_id,
            organism_id => $organism_id,
        });
        $schema->resultset("Stock::StockRelationship")->find_or_create({ subject_id => $progeny_plot->stock_id, object_id => $progeny_stock->stock_id, type_id => $plot_of_rel_type_id });

        # Link progeny plot to experiment of type 'field_layout' (required for materialized_phenoview and other search grids)
        my $progeny_experiment = $schema->resultset("NaturalDiversity::NdExperiment")->create({ nd_geolocation_id => $nd_geolocation_id, type_id => $field_layout_type_id });
        $progeny_experiment->create_related('nd_experiment_stocks', { stock_id => $progeny_plot->stock_id, type_id => $field_layout_type_id });
        $progeny_experiment->create_related('nd_experiment_projects', { project_id => $crossing_trial->project_id });

        # Progeny linked to cross
        $schema->resultset("Stock::StockRelationship")->find_or_create({ subject_id => $progeny_stock->stock_id, object_id => $cross_stock->stock_id, type_id => $offspring_of_rel_type_id });
        # Progeny also linked directly to parents (required for some progeny search types in CXGN::Cross)
        $schema->resultset("Stock::StockRelationship")->find_or_create({ subject_id => $parents{$c_info->{female}}, object_id => $progeny_stock->stock_id, type_id => $female_parent_rel_type_id, value => $c_info->{type} });
        $schema->resultset("Stock::StockRelationship")->find_or_create({ subject_id => $parents{$c_info->{male}}, object_id => $progeny_stock->stock_id, type_id => $male_parent_rel_type_id }) if $c_info->{male};
    }
}

# Refresh materialized views so they pick up the new stocks/experiments
$schema->storage->dbh->do("SELECT refresh_materialized_phenotype_jsonb_table()");
$schema->storage->dbh->do("REFRESH MATERIALIZED VIEW materialized_phenoview");

$d->while_logged_in_as('submitter', sub {
    $d->get_ok('/search/progenies_using_female');
    $d->wait_for_network_idle();

    # Input female parent name
    $d->send_keys_ok("pedigree_female_parent", "id", "TestAccession1", "input female parent name");

    # Click search all progenies button
    $d->click_ok("search_all_progenies_using_female", "id", "click Search All Progenies of this Female Parent");
    $d->wait_for_network_idle();

    # Check that the URL contains the expected parameters
    my $current_url = $d->driver->get_current_url();
    ok($current_url =~ /female_parent=TestAccession1/, "URL contains female_parent parameter");
    ok($current_url =~ /submit_button=%23search_all_progenies_using_female/, "URL contains submit_button parameter");

    # Verify the results are loaded in the search results table
    $d->find_element_ok("pedigree_female_male_search_results", "id", "find cross search results table");

    my $results_table = $d->find_element_ok("pedigree_female_male_search_results", "id", "Get results table");
    my $results_text = $results_table->get_text();
    ok($results_text =~ /TestCross1_progeny/, "Verify TestCross1_progeny is present in search results");
    ok($results_text =~ /TestCross1_progeny_sibling/, "Verify TestCross1_progeny_sibling is present in search results");
    ok($results_text =~ /TestCross2_progeny/, "Verify TestCross2_progeny is present in search results");
    ok($results_text =~ /TestCross3_progeny/, "Verify TestCross3_progeny is present in search results");
    ok($results_text =~ /TestCross4_progeny/, "Verify TestCross4_progeny is present in search results");
    ok($results_text =~ /TestCross5_progeny/, "Verify TestCross5_progeny is present in search results");
    ok($results_text =~ /TestCross6_progeny/, "Verify TestCross6_progeny is present in search results");

    # Test 2: Search Progenies using both Female and Male parents
    $d->get_ok('/search/progenies_using_female');
    $d->wait_for_network_idle();

    # Input female parent name
    my $female_input_2 = $d->find_element_ok("pedigree_female_parent", "id", "Get female parent input");
    $female_input_2->clear();
    $female_input_2->send_keys("TestAccession1");

    # Wait for male parent select to be populated and select TestAccession2
    wait_until {
        # Click outside of the input to dismiss autocomplete dropdown
        $d->click("pagetitle", "id");
        my $val = $d->find_element("pedigree_male_parent", "id")->get_attribute('innerHTML');
        return $val =~ /TestAccession2/;
    };

    $d->click_ok('//select[@id="pedigree_male_parent"]/option[text()="TestAccession2"]', 'xpath', "Select TestAccession2 as male parent");

    # Click search progenies of these parents button
    $d->click_ok("search_pedigree_female_male", "id", "click Progenies of these Parents");
    $d->wait_for_network_idle();

    # Check that the URL contains the expected parameters
    my $url = $d->driver->get_current_url();
    ok($url =~ /female_parent=TestAccession1/, "URL contains expected female parent parameter");
    ok($url =~ /male_parent=TestAccession2/, "URL contains expected male parent parameter");
    ok($url =~ /submit_button=%23search_pedigree_female_male/, "URL contains submit_button parameter");

    # Verify results - only TestCross1_progeny should be present
    $results_table = $d->find_element_ok("pedigree_female_male_search_results", "id", "Get results table");
    $results_text = $results_table->get_text();

    ok($results_text =~ /TestCross1_progeny/, "TestCross1_progeny is present for specified parents");
    ok($results_text =~ /TestCross1_progeny_sibling/, "TestCross1_progeny_sibling is present for specified parents");
    ok($results_text !~ /TestCross2_progeny/, "TestCross2_progeny is NOT present for specified parents");

    # Test 3: Search Progenies using male parent (All Progenies of this Male Parent)
    $d->get_ok('/search/progenies_using_male');
    $d->wait_for_network_idle();

    # Input male parent name
    $d->send_keys_ok("male_parent", "id", "TestAccession2", "input male parent name");

    # Click search all progenies button
    $d->click_ok("search_all_progenies_using_male", "id", "click Search All Progenies of this Male Parent");
    $d->wait_for_network_idle();

    # Check that the URL contains the expected parameters
    my $current_url_3 = $d->driver->get_current_url();
    ok($current_url_3 =~ /male_parent=TestAccession2/, "URL contains male_parent parameter");
    ok($current_url_3 =~ /submit_button=%23search_all_progenies_using_male/, "URL contains submit_button parameter");

    # Verify the results are loaded in the search results table
    $d->find_element_ok("pedigree_male_female_search_results", "id", "find cross search results table");

    my $results_table_3 = $d->find_element_ok("pedigree_male_female_search_results", "id", "Get results table");
    my $results_text_3 = $results_table_3->get_text();
    ok($results_text_3 =~ /TestCross1_progeny/, "Verify TestCross1_progeny is present in search results");
    ok($results_text_3 =~ /TestCross1_progeny_sibling/, "Verify TestCross1_progeny_sibling is present in search results");
    ok($results_text_3 !~ /TestCross2_progeny/, "Verify TestCross2_progeny is NOT present in search results");

    # Test 4: Search Progenies using both Male and Female parents
    $d->get_ok('/search/progenies_using_male');
    $d->wait_for_network_idle();

    # Input male parent name
    my $male_input_4 = $d->find_element_ok("male_parent", "id", "Get male parent input");
    $male_input_4->clear();
    $male_input_4->send_keys("TestAccession4");

    # Wait for female parent select to be populated and select TestAccession1
    wait_until {
        # Click outside of the input to dismiss autocomplete dropdown
        $d->click("pagetitle", "id");
        my $val = $d->find_element("female_parent", "id")->get_attribute('innerHTML');
        return $val =~ /TestAccession1/;
    };

    $d->click_ok('//select[@id="female_parent"]/option[text()="TestAccession1"]', 'xpath', "Select TestAccession1 as female parent");

    # Click search progenies of these parents button
    $d->click_ok("search_pedigree_male_female", "id", "click Progenies of these Parents");
    $d->wait_for_network_idle();

    # Check that the URL contains the expected parameters
    my $url_4 = $d->driver->get_current_url();
    ok($url_4 =~ /male_parent=TestAccession4/, "URL contains expected male parent parameter");
    ok($url_4 =~ /female_parent=TestAccession1/, "URL contains expected female parent parameter");
    ok($url_4 =~ /submit_button=%23search_pedigree_male_female/, "URL contains submit_button parameter");

    # Verify results - only TestCross3_progeny should be present
    my $results_table_4 = $d->find_element_ok("pedigree_male_female_search_results", "id", "Get results table");
    my $results_text_4 = $results_table_4->get_text();

    ok($results_text_4 =~ /TestCross3_progeny/, "TestCross3_progeny is present for specified parents");
    ok($results_text_4 !~ /TestCross1_progeny/, "TestCross1_progeny is NOT present for specified parents");
});

$d->driver->quit();
$f->clean_up_db();
done_testing();
