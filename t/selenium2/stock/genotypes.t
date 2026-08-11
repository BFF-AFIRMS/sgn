
use strict;

use lib 't/lib';

use Test::More qw| no_plan |;
use SGN::Test::Fixture;
use SGN::Test::WWW::WebDriver;
use SGN::Test::WWW::Mechanize;
use Shared::Genotypes qw |create_tissue_sample_genotypes upload_tissue_sample_genotypes|;

my $d = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $mech = SGN::Test::WWW::Mechanize->new;
my $schema = $f->bcs_schema;

# Create tissue samples and upload genotypes
create_tissue_sample_genotypes($schema);
my $response = upload_tissue_sample_genotypes($schema, $mech);
ok($response->is_success, 'upload response is success');

$d->while_logged_in_as("curator", sub {

    # -------------------------------------------------------------------------
    # Accession that is directly genotyped (no tissue sample intermediate)

    my $stock_name = 'UG120180';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to accession stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td><a href="/breeders_toolbox/trial/142">test_population2</a></td>
        <td>test_population2</td>
        <td>GBS ApeKI genotyping v4</td>
        <td>Cassava SNP genotypes for stock 520 20 24 25 29 30 44 46 108 109 112 114 520name = UG120180, id = 39973)</td>
        <td><a href="/stock/39973/genotypes?genotype_id=798">Download</a></td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "accession $stock_name has 1 expected genotypes");

    # -------------------------------------------------------------------------
    # Tissue samples that are genotyped

    # Check that accession test_accession1 has 3 genotype records
    my $stock_name = 'test_accession1';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to accession stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-1, id = 41794)</td>
        <td><a href="/stock/38840/genotypes?genotype_id=1064">Download</a></td>
    </tr>
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-2, id = 41795)</td>
        <td><a href="/stock/38840/genotypes?genotype_id=1065">Download</a></td>
    </tr>
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-3, id = 41796)</td>
        <td><a href="/stock/38840/genotypes?genotype_id=1066">Download</a></td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "accession $stock_name has 3 expected genotypes");

    # Check that the plot test_trial25 has 2 genotype records
    my $stock_name = 'test_trial25';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to plot stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-1, id = 41794)</td>
        <td><a href="/stock/38861/genotypes?genotype_id=1064">Download</a></td>
    </tr>
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-2, id = 41795)</td>
        <td><a href="/stock/38861/genotypes?genotype_id=1065">Download</a></td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "plot $stock_name has 2 expected genotypes");

    # Check that the plot test_trial28 has 1 genotype record
    my $stock_name = 'test_trial28';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to plot stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-3, id = 41796)</td>
        <td><a href="/stock/38864/genotypes?genotype_id=1066">Download</a></td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "plot $stock_name has 1 expected genotype");

    # Check that the plant test_accession1_plant-3 has 1 genotype records
    my $stock_name = 'test_accession1_plant-3';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to plant stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-3, id = 41796)</td>
        <td><a href="/stock/41797/genotypes?genotype_id=1066">Download</a></td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "plant $stock_name has 1 expected genotype");

    # Check that the tissue_sample test_accession1_leaf-3 has 1 genotype records
    my $stock_name = 'test_accession1_leaf-3';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to tissue_sample stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td><a href="/breeders_toolbox/trial/166">Tissue Sample Genotype Test</a></td>
        <td>Test uploading genotypes to tissue samples</td>
        <td>Test Genotyping Protocol for Tissue Samples</td>
        <td>SNP genotypes for stock (name = test_accession1_leaf-3, id = 41796)</td>
        <td><a href="/stock/41796/genotypes?genotype_id=1066">Download</a></td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "plant $stock_name has 1 expected genotype");

    # -------------------------------------------------------------------------
    # Accession with no genotypes

    my $stock_name = 'IITA-TMS-IBA011412';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to accession stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td colspan="5" class="dt-empty">No data available in table</td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "accession $stock_name has 0 expected genotypes");

    # -------------------------------------------------------------------------
    # Plot with no genotypes

    my $stock_name = 'KASESE_TP2013_1000';
    my $stock_id = $schema->resultset('Stock::Stock')->find( { uniquename => $stock_name })->stock_id();
    $d->get_ok("/stock/$stock_id/view", "navigate to plot stock page");
    $d->click_ok('stock_genotypes_section_onswitch', 'id', "Expand genotypes section");
    $d->wait_for_network_idle();
    my $observed_tbody = $d->get_attribute_ok("//table[\@id='stock_direct_genotypes_datatable']/tbody", "xpath", "innerHTML", "get $stock_name genotype table");
    my $expected_tbody = '
    <tr>
        <td colspan="5" class="dt-empty">No data available in table</td>
    </tr>';
    $expected_tbody =~ s/^[ ]+|\R//mg;
    is($observed_tbody, $expected_tbody, "plot $stock_name has 0 expected genotypes");

});

$d->driver->quit();
$f->clean_up_db();
done_testing();
