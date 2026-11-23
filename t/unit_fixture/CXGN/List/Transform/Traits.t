
use strict;
use warnings;

use lib 't/lib';

use Test::More;
use SGN::Test::Fixture;
use CXGN::List::Transform;
use CXGN::Onto;
use CXGN::Trait::Treatment;

my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema();
my $dbh = $f->dbh();

# -----------------------------------------------------------------------------
# Create composed traits and treatments with time ontology

my $top_yield_id = $schema->resultset('Cv::Cvterm')->find({name => 'top yield'})->cvterm_id();
my $root_color_id = $schema->resultset('Cv::Cvterm')->find({name => 'root color'})->cvterm_id();
my $cm_id = $schema->resultset('Cv::Cvterm')->find({name => 'cm'})->cvterm_id();
my $year_5_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 5'})->cvterm_id();
my $year_10_id = $schema->resultset('Cv::Cvterm')->find({name => 'year 10'})->cvterm_id();
my $month_2_id = $schema->resultset('Cv::Cvterm')->find({name => 'month 2'})->cvterm_id();
my $week_5_id = $schema->resultset('Cv::Cvterm')->find({name => 'week 5'})->cvterm_id();

my $new_trait_names = {
    'root color|year 10' => "$root_color_id,$year_10_id,$cm_id",    
    'root color|year 10|week 5' => "$root_color_id,$year_10_id,$week_5_id,$cm_id",
    'root color|year 10|month 2' => "$root_color_id,$year_10_id,$month_2_id,$cm_id",
    'root color|year 5' => "$root_color_id,$year_5_id,$cm_id",
    'top yield|year 10' => "$top_yield_id,$year_10_id",
    'top yield|year 5' => "$top_yield_id,$year_5_id",
};

# Create composed trait
my $onto = CXGN::Onto->new( { schema => $schema } );
ok(my $new_traits = $onto->store_composed_term($new_trait_names, 'trait'), 'store composed traits');
my @trait_ids = map { $_->[0] } @$new_traits;
my @trait_names = map { $_->[1] } @$new_traits;

# Create treatment
my $treatment = CXGN::Trait::Treatment->new({
    bcs_schema => $schema,
    definition => 'A treatment to test trait sorting',
    name => 'watered',
    format => 'boolean'
});

my $exp_treatment_root_term = 'Experimental treatment ontology|EXPERIMENT_TREATMENT:0000000';
ok($treatment->store($exp_treatment_root_term), 'store test treatment');
my $treatment_id = $treatment->cvterm_id();

# Create synonym
my $treatment_cvterm = $schema->resultset('Cv::Cvterm')->find({cvterm_id => $treatment_id});
$treatment_cvterm->add_synonym('Wt');

push(@trait_ids, $treatment_id);
push(@trait_names, $treatment->display_name());

# Create composed treatments
my $new_treatment_names = {
    'watered|week 5' => "$treatment_id,$week_5_id",
    'watered|month 2' => "$treatment_id,$month_2_id",
};
ok(my $new_treatments = $onto->store_composed_term($new_treatment_names, 'experiment_treatment'), 'store composed treatments');
my @treatment_ids = map { $_->[0] } @$new_treatments;
my @treatment_names = map { $_->[1] } @$new_treatments;

push(@trait_ids, @treatment_ids);
push(@trait_names, @treatment_names);

# -----------------------------------------------------------------------------
# Order IDs by Name (Plugin: TraitIds2OrderName)
# Reminder: Treatments always come before traits

my $t = CXGN::List::Transform->new();

my $trait_ids_2_order_name = $t->transform($schema, 'trait_ids_2_order_name', \@trait_ids);
my @observed_name_order = map { $trait_ids_2_order_name->{mapping}->{$_}->{name} } @{$trait_ids_2_order_name->{transform}};

my @expected_name_order = (
    'watered',                    # Treatment -> Wt 
    'watered|week 5',             # Treatment -> Wt
    'watered|month 2',            # Treatment -> Wt
    'root color|year 5',          # Trait     -> "rtcol" EXACT []
    'root color|year 10',         # Trait     -> "rtcol" EXACT []
    'root color|year 10|week 5',  # Trait     -> "rtcol" EXACT []
    'root color|year 10|month 2', # Trait     -> "rtcol" EXACT []
    'top yield|year 5',           # Trait     -> RtYld_FreshAerial_tha
    'top yield|year 10',          # Trait     -> RtYld_FreshAerial_tha
);
is_deeply(\@observed_name_order, \@expected_name_order, 'Order IDs by Name');

# -----------------------------------------------------------------------------
# Order IDs by Synonym (Plugin: TraitIds2OrderSynonym)
# Reminder: Treatments always come before traits

my $trait_ids_2_order_synonym = $t->transform($schema, 'trait_ids_2_order_synonym', \@trait_ids);
my @observed_synonym_order = map { $trait_ids_2_order_synonym->{mapping}->{$_}->{name} } @{$trait_ids_2_order_synonym->{transform}};
my @expected_synonym_order = (
    'watered',                    # Treatment -> Wt
    'watered|week 5',             # Treatment -> Wt
    'watered|month 2',            # Treatment -> Wt
    'top yield|year 5',           # Trait     -> RtYld_FreshAerial_tha
    'top yield|year 10',          # Trait     -> RtYld_FreshAerial_tha
    'root color|year 5',          # Trait     -> "rtcol" EXACT []
    'root color|year 10',         # Trait     -> "rtcol" EXACT []
    'root color|year 10|week 5',  # Trait     -> "rtcol" EXACT []
    'root color|year 10|month 2', # Trait     -> "rtcol" EXACT []
);
is_deeply(\@observed_synonym_order, \@expected_synonym_order, 'Order IDs by Synonym');

# -----------------------------------------------------------------------------
# Order Names by Name (Plugin: Traits2OrderName)

my $traits_2_order_name = $t->transform($schema, 'traits_2_order_name', \@trait_names);
my @observed_name_order = map { $trait_ids_2_order_name->{mapping}->{$_}->{name} } @{$traits_2_order_name->{transform}};
is_deeply(\@observed_name_order, \@expected_name_order, 'Order Names by Name');


# -----------------------------------------------------------------------------
# Order Names by Synonym (Plugin: Traits2OrderSynonym)

my $traits_2_order_synonym = $t->transform($schema, 'traits_2_order_synonym', \@trait_names);
my @observed_synonym_order = map { $trait_ids_2_order_synonym->{mapping}->{$_}->{name} } @{$traits_2_order_synonym->{transform}};
is_deeply(\@observed_synonym_order, \@expected_synonym_order, 'Order Names by Synonym');

# -----------------------------------------------------------------------------
# Cleanup

$f->clean_up_db();
done_testing();
