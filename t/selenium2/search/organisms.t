use strict;
use warnings;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;

my $d = SGN::Test::WWW::WebDriver->new();

$d->get_ok('/search/organisms');
$d->wait_for_network_idle();

# Verify page title
ok($d->driver()->get_page_source() =~ /Organism\/Taxon Search/, "Search page title presence");

# 1. Search by species "Picea"
$d->send_keys_ok("species", "name", "Picea", "Input species name 'Picea'");

$d->click_ok("submit", "name", "Click submit button");
$d->wait_for_network_idle();

my $source = $d->driver()->get_page_source();
ok($source =~ /Picea glauca/, "Results have Picea glauca");
ok($source =~ /white spruce/, "Results have white spruce");
ok($source !~ /Pinus contorta/, "Results do not have Pinus contorta");

# 2. Test reset button
$d->click_ok("reset_organism_search", "id", "Click reset button");
$d->wait_for_network_idle();

my $species_input = $d->find_element_ok("species", "name", "Find species input field after reset");
is($species_input->get_attribute('value'), '', "Species input is empty after reset");

# 3. Search by common name "Pine"
$d->send_keys_ok("common_name", "name", "Pine", "Input common name 'Pine'");

$d->click_ok("submit", "name", "Click submit button");
$d->wait_for_network_idle();

$source = $d->driver()->get_page_source();
ok($source =~ /Pinus contorta/, "Results have Pinus contorta");
ok($source =~ /lodgepole pine/, "Results have lodgepole pine");
ok($source !~ /Picea glauca/, "Results do not have Picea glauca");

# 4. Search by partial prefix "Pi"
$d->click_ok("reset_organism_search", "id", "Click reset button to start prefix search");
$d->wait_for_network_idle();

$d->send_keys_ok("species", "name", "Pi", "Input species prefix 'Pi'");

$d->click_ok("submit", "name", "Click submit button");
$d->wait_for_network_idle();

$source = $d->driver()->get_page_source();
ok($source =~ /Picea glauca/, "Results have Picea glauca with prefix 'Pi'");
ok($source =~ /Pinus contorta/, "Results have Pinus contorta with prefix 'Pi'");

# Clean up and finish
$d->driver->quit();
done_testing();
