
use strict;
use warnings;

use lib 't/lib';

use Test::More;
use SGN::Test::Fixture;
use CXGN::List::Transform;

my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema();
my $dbh = $f->dbh();

# -----------------------------------------------------------------------------
# Order Components

my $year_1_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 1'})->cvterm_id();
my $year_5_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 5'})->cvterm_id();
my $year_10_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 10'})->cvterm_id();
my $month_2_id = $schema->resultset('Cv::Cvterm')->find({name => 'month 2'})->cvterm_id();
my $month_4_id = $schema->resultset('Cv::Cvterm')->find({name => 'month 4'})->cvterm_id();
my $month_11_id = $schema->resultset('Cv::Cvterm')->find({name => 'month 11'})->cvterm_id();

my $t = CXGN::List::Transform->new();
my @component_ids = (
    $year_1_id, $year_5_id, $year_10_id,
    $month_2_id, $month_4_id, $month_11_id
);

my $trait_component_ids_2_order = $t->transform($schema, 'trait_component_ids_2_order', \@component_ids);
my @observed_order = map { $trait_component_ids_2_order->{mapping}->{$_}->{name} } @{$trait_component_ids_2_order->{transform}};

my @expected_order = (
    'month 2', 'month 4', 'month 11',
    'year 1', 'year 5', 'year 10'
);
is_deeply(\@observed_order, \@expected_order, 'Order Trait Component Ids');

# -----------------------------------------------------------------------------
# Cleanup

$f->clean_up_db();
done_testing();
