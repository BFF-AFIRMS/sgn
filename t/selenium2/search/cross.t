use strict;
use warnings;
use lib 't/lib';

use Test::More;
use SGN::Test::WWW::WebDriver;

my $d = SGN::Test::WWW::WebDriver->new();

$d->get_ok('/search/cross');
$d->wait_for_network_idle();

# Click to open progeny search section
$d->click_ok("progeny_search_section_onswitch", "id", "open progeny search section");
sleep(1);

# Click to open search progenies of female parent
$d->click_ok('//span[@id="progeny_search_section_content"]//a[contains(., "Female Parents")]', 'xpath', "click Search Progenies of Female Parents");
sleep(1);

# Input female parent name
$d->send_keys_ok("pedigree_female_parent", "id", "test_accession1", "input female parent name");

# Click search all progenies button
$d->click_ok("search_all_progenies_using_female", "id", "click Search All Progenies of this Female Parent");
$d->wait_for_network_idle();
sleep(2);

$d->driver->quit();
done_testing();
