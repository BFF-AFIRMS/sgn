
use strict;
use warnings;

use lib 't/lib';

use Test::More;
use SGN::Test::Fixture;

use Data::Dumper;
use CXGN::List;
use CXGN::Onto;

my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema();
my $dbh = $f->dbh();

# Create new trait list
my $list_id = CXGN::List::create_list($dbh, 'test_transform_traits', 'Test trait transformation', 41);
my $list = CXGN::List->new( { dbh => $dbh, list_id => $list_id } );
$list->type("traits");

# [Optional] Create composed traits and treatments with time ontology
my $plant_height_id = $schema->resultset('Cv::Cvterm')->find({name => 'plant height measurement in cm'})->cvterm_id();
my $cm_id = $schema->resultset('Cv::Cvterm')->find({name => 'cm'})->cvterm_id();
my $year_5_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 5'})->cvterm_id();
my $year_10_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 10'})->cvterm_id();
my $month_2_id = $schema->resultset('Cv::Cvterm')->find({name => 'month 2'})->cvterm_id();
my $day_18_id = $schema->resultset('Cv::Cvterm')->find({name => 'day 18'})->cvterm_id();

my $new_trait_names = {
    #'plant height measurement in cm|year 5' => "$plant_height_id,$year_5_id,$cm_id",
    #'plant height measurement in cm|year 10' => "$plant_height_id,$year_10_id,$cm_id",
    #'plant height measurement in cm|year 10|day 15' => "$plant_height_id,$year_10_id,$day_15_id,$cm_id",
    #'plant height measurement in cm|year 10|month 2' => "$plant_height_id,$year_10_id,$month_2_id,$cm_id",
};

print STDERR "\n\nsaving\n\n";
my $onto = CXGN::Onto->new( { schema => $schema } );
my $new_terms = $onto->store_composed_term($new_trait_names, 'trait');

# print STDERR "\n\ndone\n\n";
# # Add traits and treatements to list

# my $error = $list->add_element("cass sink leaf|ADP|ug/g|week 16");
# ok(!$error, "adding an element to the list");

# /ajax/onto/store_composed_term
# 'new_trait_names': JSON.stringify(new_trait_names)

# my $list = CXGN::List->new( { dbh => $dbh, list_id => 12 } );
# my $flat_list = $list->elements();
# print STDERR Dumper($flat_list);

# my $list_validator = CXGN::List::Transform->new();

# $flat_list->[0] = uc($flat_list->[0]);
# print STDERR Dumper($flat_list);
# my $results = $list_validator->transform($schema, 'accessions_2_accession_case', $flat_list);

# is($results->{mapping}->{NEW_TEST_CROSSP005}, 'new_test_crossP005', 'identify wrong case');

# print STDERR Dumper($results);

#$f->clean_up_db();
done_testing();
