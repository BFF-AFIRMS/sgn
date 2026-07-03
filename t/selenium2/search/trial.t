
use strict;

use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;

my $d = SGN::Test::WWW::WebDriver->new();

$d->get_ok('/search/trials');

$d->wait_for_network_idle();

my $source = $d->driver->get_page_source();
ok($source =~ /Kasese/, "find trial search result content");
ok($source =~ /2014/, "find trial year in trial search results");

# Helper to get a column-specific input element from tfoot by index
sub get_column_input {
    my ($index) = @_;
    return $d->find_element("//div[\@id='trial_search_results_wrapper']//div[\@class='dt-scroll-foot']//tfoot//input[\@data-index='$index']", "xpath");
}

sub get_search_results {
    $d->wait_for_network_idle();
    return $d->get_text("trial_search_results", "id");
}

# Test Single Column-Level Filtering (Trial name)
my $name_input = get_column_input(0);
$name_input->clear();
$name_input->send_keys("Kasese");

my $grid_text = get_search_results();
ok($grid_text =~ /Kasese solgs trial/, "Column filter matching 'Kasese' shows Kasese trial");
ok($grid_text !~ /CASS_6Genotypes_Sampling_2015/, "Column filter matching 'Kasese' hides CASS trial");
$name_input->clear();

# Test Year Column-Level Filtering
my $year_input = get_column_input(4);
$year_input->clear();
$year_input->send_keys("2017");

$grid_text = get_search_results();
ok($grid_text =~ /CASS_6Genotypes_Sampling_2015/, "Year column filter '2017' shows matching CASS sampling trial");
ok($grid_text !~ /Kasese solgs trial/, "Year column filter '2017' hides 2014 Kasese trial");
$year_input->clear();

# Test Design Column-Level Filtering
my $design_input = get_column_input(7);
$design_input->clear();
$design_input->send_keys("Alpha");

$grid_text = get_search_results();
ok($grid_text =~ /Kasese solgs trial/, "Design column filter 'Alpha' shows Kasese trial");
ok($grid_text !~ /test_trial/, "Design column filter 'Alpha' hides CRD test_trial");
$design_input->clear();

# Test Multiple Column-Level Filters Combined (Year = 2014 AND Location = test_location)
$year_input->clear();
$year_input->send_keys("2014");

my $loc_input = get_column_input(5);
$loc_input->clear();
$loc_input->send_keys("test_location");

$grid_text = get_search_results();
ok($grid_text =~ /Kasese solgs trial/, "Combined column filters (Year=2014, Location=test_location) match Kasese solgs trial");
ok($grid_text =~ /test_trial/, "Combined column filters match test_trial");

# Narrow down further with another column filter (Trial Type = Clonal Evaluation)
my $type_input = get_column_input(6);
$type_input->clear();
$type_input->send_keys("Clonal Evaluation");

$grid_text = get_search_results();
ok($grid_text =~ /Kasese solgs trial/, "Narrowed filters match Kasese trial");
ok($grid_text !~ /test_trial/, "Narrowed filters hide test_trial because of Trial Type mismatch");

# Clear multiple column filters
$year_input->clear();
$loc_input->clear();
$type_input->clear();

# Combined Global Search + Column-Level Filter (Global = 'trial' AND Column Design = 'CRD')
my $global_search = $d->find_element("//div[\@id='trial_search_results_wrapper']//input[\@type='search']", "xpath");
$global_search->clear();
$global_search->send_keys("trial");

$grid_text = get_search_results();
ok($grid_text =~ /CASS_6Genotypes_Sampling_2015/, "Global search 'trial' shows matching CASS sampling trial");
ok($grid_text =~ /test_trial/, "Global search 'trial' shows test_trial");
ok($grid_text =~ /Kasese solgs trial/, "Global search 'trial' shows Kasese trial");
ok($grid_text =~ /trial2 NaCRRI/, "Global search 'trial' shows trial2 NaCRRI");
ok($grid_text !~ /test tets/, "Global search 'trial' hides test_t");
ok($grid_text !~ /new_test_cross/, "Global search 'trial' hides new_test_cross");

# Restrict to CRD design using column-level filter
$design_input->clear();
$design_input->send_keys("CRD");

$grid_text = get_search_results();
ok($grid_text =~ /test_trial/, "Global 'trial' + Column Design 'CRD' matches test_trial");
ok($grid_text =~ /trial2 NaCRRI/, "Global 'trial' + Column Design 'CRD' matches trial2 NaCRRI");
ok($grid_text !~ /CASS_6Genotypes_Sampling_2015/, "Global 'trial' + Column Design 'CRD' hides CASS_6Genotypes_Sampling_2015");
ok($grid_text !~ /Kasese solgs trial/, "Global 'trial' + Column Design 'CRD' hides Kasese solgs trial");

$global_search->clear();
$design_input->clear();

# Test empty / no matches state
my $desc_input = get_column_input(1);
$desc_input->clear();
$desc_input->send_keys("NonExistentDescriptionQueryString");

$grid_text = get_search_results();
ok($grid_text =~ /No data available in table/ || $grid_text =~ /No matching records found/, "Empty results message is displayed for conflicting query");

done_testing();


