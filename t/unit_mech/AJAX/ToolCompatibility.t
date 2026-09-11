

use strict;
use warnings;

use CXGN::BreederSearch;
use CXGN::Dataset;
use Data::Dumper;
use lib 't/lib';
use JSON;
use SGN::Test::Fixture;
use Test::More;
use Test::WWW::Mechanize;

my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;
my $people_schema = $f->people_schema();

my $mech = Test::WWW::Mechanize->new;
my $response;
my $bs = CXGN::BreederSearch->new( { dbh=> $f->dbh() });

# login
$mech->post_ok('http://localhost:3010/brapi/v1/token', [ "username"=> "janedoe", "password"=> "secretpw", "grant_type"=> "password" ], 'login with brapi call');
$response = decode_json $mech->content;
is($response->{'userDisplayName'}, 'Jane Doe', 'check login name');

# create a suitable dataset, using all accessions from trials 139 and 141
my $ds = CXGN::Dataset->new( { schema=> $schema, people_schema => $people_schema });
my $criteria_list = ['trials', 'accessions'];
my $dataref = {'accessions' => { 'trials' => '139,141' }};
my $queryref = { 'accessions' => { 'trials' => 0 }};
my $results = $bs->metadata_query($criteria_list, $dataref, $queryref)->{results};
my @accession_ids;
foreach my $record (@$results) {
    my ($accession_id, $accession_name) = @$record;
    push @accession_ids, $accession_id;
}
$ds->accessions(\@accession_ids);
$ds->store();

# calculate tool compatibility
my $dataset_id = $ds->sp_dataset_id();
$mech->get_ok("http://localhost:3010/ajax/dataset/calc_tool_compatibility/$dataset_id", 'calcualate tool compatibility');
$response = decode_json $mech->content;
is($response->{'success'}, '1', 'tool compatibility submit message');

# retrieve tool compatibility
my $tool_compatibility = '(not calculated)';
my $num_attempts = 0;
my $max_attempts = 10;
while ($tool_compatibility eq '(not calculated)' && $num_attempts < $max_attempts){
    $mech->get_ok("http://localhost:3010/ajax/dataset/retrieve/$dataset_id/tool_compatibility", 'retrieve tool compatibility');
    $response = decode_json $mech->content;
    $tool_compatibility = $response->{tool_compatibility};
    sleep(1);
    $num_attempts += 1;
}
$tool_compatibility = decode_json $tool_compatibility;

# check expected values
is_deeply($tool_compatibility->{'Boxplotter'}->{compatible}, 1, "Boxplotter is compatible");
is_deeply($tool_compatibility->{'Clustering'}->{compatible}, 1, "Clustering is compatible");
is_deeply($tool_compatibility->{'Correlation'}->{compatible}, 1, "Correlation is compatible");
is_deeply($tool_compatibility->{'GWAS'}->{compatible}, 1, "GWAS is compatible");
is_deeply($tool_compatibility->{'Heritability'}->{compatible}, 1, "Heritability is compatible");
is_deeply($tool_compatibility->{'Kinship & Inbreeding'}->{compatible}, 1, "Kinship & Inbreeding is compatible");
is_deeply($tool_compatibility->{'Mixed Models'}->{compatible}, 1, "Mixed Models is compatible");
is_deeply($tool_compatibility->{'NIRS'}->{compatible}, 0, "NIRS is compatible");
is_deeply($tool_compatibility->{'Population Structure'}->{compatible}, 1, "Population Structure is compatible");
is_deeply($tool_compatibility->{'Stability'}->{compatible}, 0, "Stability is incompatible");


# remove changes to the database
$ds->delete();
done_testing();
