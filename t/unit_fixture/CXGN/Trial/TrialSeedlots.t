use strict;
use lib 't/lib';

use JSON;
use Test::More;
use Test::WWW::Mechanize;
use SGN::Test::Fixture;
use SGN::Model::Cvterm;

use Bio::GeneticRelationships::Individual;
use Bio::GeneticRelationships::Pedigree;

use CXGN::Stock::Seedlot;
use CXGN::Pedigree::AddCrosses;
use CXGN::Pedigree::AddCrossingtrial;
use CXGN::Pedigree::AddProgeny;
use CXGN::Trial::ParseUpload;
use CXGN::Trial::TrialCreate;

my $mech = Test::WWW::Mechanize->new;
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;
my $dbh = $f->dbh;
my $phenome_schema = $f->phenome_schema();

# Setup shared variables
my $breeding_program_id   = $schema->resultset('Project::Project')->find({ name => 'test' })->project_id();
my $location_name = 'test_location';
my $location_id = $schema->resultset('NaturalDiversity::NdGeolocation')->find({description => $location_name})->nd_geolocation_id();

# -----------------------------------------------------------------------------
# Create Crossing Trial

my $add_crossingtrial = CXGN::Pedigree::AddCrossingtrial->new({
    chado_schema        => $schema,
    dbh                 => $dbh,
    breeding_program_id => $breeding_program_id,
    year                => '2026',
    crossingtrial_name  => 'seedlot_crossing_trial',
    project_description => 'Description of seedlot crossing trial',   
    nd_geolocation_id   => $location_id,
    owner_id            => 41
});
ok($add_crossingtrial->save_crossingtrial(), 'Create crossing trial');

my $crossing_trial_id = $schema->resultset('Project::Project')->find({ name => 'seedlot_crossing_trial' })->project_id();

# -----------------------------------------------------------------------------
# Create Crosses

my $female_parent = Bio::GeneticRelationships::Individual->new(name => 'test_accession1');
my $male_parent = Bio::GeneticRelationships::Individual->new(name => 'test_accession2');

# Create open-pollinated cross
my $cross_op = Bio::GeneticRelationships::Pedigree->new(
    name          => 'cross_op',
    cross_type    => 'open',
    female_parent => $female_parent,
);
# Create biparental cross
my $cross_biparental = Bio::GeneticRelationships::Pedigree->new(
    name => 'cross_biparental',
    cross_type    => 'biparental',
    female_parent => $female_parent,
    male_parent   => $male_parent,
);
# Add crosses to crossing trial
my $add_cross = CXGN::Pedigree::AddCrosses->new({
    chado_schema      => $schema,
    phenome_schema    => $phenome_schema,
    dbh               => $dbh,
    crossing_trial_id => $crossing_trial_id,
    crosses           => [$cross_op, $cross_biparental],
    user_id           => 41,
});
ok($add_cross->add_crosses(), 'Add crosses to crossing trial');

my $cross_op_id = $schema->resultset('Stock::Stock')->find({ uniquename => 'cross_op' })->stock_id;
my $cross_biparental_id = $schema->resultset('Stock::Stock')->find({ uniquename => 'cross_biparental' })->stock_id;

# -----------------------------------------------------------------------------
# Create seedlots

# Create open-pollinated seedlot
my $seedlot_op = CXGN::Stock::Seedlot->new( schema => $schema);
$seedlot_op->uniquename("seedlot_cross_op");
$seedlot_op->location_code("test_location");
$seedlot_op->cross_stock_id($cross_op_id);
$seedlot_op->breeding_program_id($breeding_program_id);
ok($seedlot_op->store(), 'Create open-pollinated seedlot');

# Create biparental seedlot
my $seedlot_biparental = CXGN::Stock::Seedlot->new( schema => $schema);
$seedlot_biparental->uniquename("seedlot_cross_biparental");
$seedlot_biparental->location_code("test_location");
$seedlot_biparental->cross_stock_id($cross_biparental_id);
$seedlot_biparental->breeding_program_id($breeding_program_id);
ok($seedlot_biparental->store(), 'Create biparental seedlot');

# Create accession seedlot
my $test_accession_id = $schema->resultset('Stock::Stock')->find({ uniquename => 'test_accession1' })->stock_id;
my $seedlot_biparental = CXGN::Stock::Seedlot->new( schema => $schema);
$seedlot_biparental->uniquename("seedlot_accession");
$seedlot_biparental->location_code("test_location");
$seedlot_biparental->cross_stock_id($test_accession_id);
$seedlot_biparental->breeding_program_id($breeding_program_id);
ok($seedlot_biparental->store(), 'Create accession seedlot');

# -----------------------------------------------------------------------------
# Create cross progeny

# Create open-pollinated progeny
my $progeny_op = CXGN::Pedigree::AddProgeny->new({
    chado_schema   => $schema,
    phenome_schema => $phenome_schema,
    owner_name     => 'janedoe',
    dbh            => $dbh,
    cross_name     => 'cross_op',
    progeny_names  => ['cross_op_accession_001', 'cross_op_accession_002'],
} );
ok($progeny_op->add_progeny(), 'Add progeny to cross_op');

# Create biparental progeny
my $progeny_biparental = CXGN::Pedigree::AddProgeny->new({
    chado_schema   => $schema,
    phenome_schema => $phenome_schema,
    owner_name     => 'janedoe',
    dbh            => $dbh,
    cross_name     => 'cross_biparental',
    progeny_names  => ['cross_biparental_accession_001', 'cross_biparental_accession_002'],
} );
ok($progeny_biparental->add_progeny(), 'Add progeny to cross_biparental');

# -----------------------------------------------------------------------------
# Create trial using multi upload

my $trial_file_path = "t/data/trial/accession_trial_layout_with_seedlot_from_cross.xlsx";
my $parser  = CXGN::Trial::ParseUpload->new(chado_schema=> $schema, filename => $trial_file_path);
$parser->load_plugin('MultipleTrialDesignGeneric');
my $parsed_data = $parser->parse();

my $trial_data = $parsed_data->{"seedlot_trial"};
my $trial_create = CXGN::Trial::TrialCreate->new({
    chado_schema 		=> $schema,
    dbh 				=> $dbh,
    owner_id 			=> 41,
   	trial_year 			=> $trial_data->{year},
   	trial_description 	=> $trial_data->{description},
   	trial_name 			=> 'seedlot_trial',
   	design_type 		=> $trial_data->{design_type},
   	design 				=> $trial_data->{design_details},
   	program				=> $trial_data->{breeding_program},
	trial_location 		=> $trial_data->{location},
    operator 			=> "janedoe",
});
my $save = $trial_create->save_trial();
ok($trial_create->save_trial(), "Create trial");

 my $trial_id = $schema->resultset('Project::Project')->find({ name => 'seedlot_trial' })->project_id();

# -----------------------------------------------------------------------------
# Add seedlot to plots

# jQuery('#trial_upload_used_seedlot_form').attr("action", "/ajax/breeders/trial/<% $trial_id %>/upload_used_seedlots?trial_stock_type=<% $trial_stock_type %>");

my $seedlot_file_path = my $trial_file_path = "t/data/trial/accession_trial_layout_with_seedlot_upload.csv";
my $parser = CXGN::Trial::ParseUpload->new(
    chado_schema => $schema,
    filename => $seedlot_file_path,
    trial_id => $trial_id,
    trial_stock_type =>'accession'
);
$parser->load_plugin('TrialUsedSeedlotsGeneric');
my $parsed_data = $parser->parse();

while (my ($key, $data) = each(%$parsed_data)){
    my $transaction = CXGN::Stock::Seedlot::Transaction->new(schema => $schema);
    my $time = DateTime->now();
    my $timestamp = $time->ymd()."_".$time->hms();

    $transaction->factor(1);
    $transaction->from_stock([$data->{seedlot_stock_id}, $data->{seedlot_name}]);
    $transaction->to_stock([$data->{plot_stock_id}, $data->{plot_name}]);
    $transaction->amount($data->{amount});
    $transaction->weight_gram($data->{weight_gram});
    $transaction->description($data->{description});
    $transaction->timestamp($timestamp);
    $transaction->operator('janedoe');
    my $test_name = 'Adding seedlot ' .  $data->{seedlot_name} . ' to plot ' . $data->{plot_name};
    ok($transaction->store(), $test_name);

    my $seedlot = CXGN::Stock::Seedlot->new(schema => $schema, seedlot_id => $data->{seedlot_stock_id});
    $seedlot->set_current_count_property();
    $seedlot->set_current_weight_property();
}

$f->clean_up_db();
done_testing();
