use strict;
use lib 't/lib';

use Bio::GeneticRelationships::Individual;
use Bio::GeneticRelationships::Pedigree;
use CXGN::Stock::Seedlot;
use CXGN::Pedigree::AddCrosses;
use CXGN::Pedigree::AddCrossingtrial;
use CXGN::Pedigree::AddFamilyNames;
use CXGN::Pedigree::AddProgeny;
use CXGN::Trial::Download;
use CXGN::Trial::ParseUpload;
use CXGN::Trial::TrialCreate;
use Excel::Writer::XLSX;
use File::Slurp qw(read_file);
use JSON;
use SGN::Test::Fixture;
use SGN::Model::Cvterm;
use Test::More;
use Test::WWW::Mechanize;

my $mech = Test::WWW::Mechanize->new;
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;
my $dbh = $f->dbh;
my $phenome_schema = $f->phenome_schema();
my $breeding_program_name = 'test';
my $breeding_program_id   = $schema->resultset('Project::Project')->find({ name => $breeding_program_name })->project_id();
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
# Create Family Name

my $family_name_add = CXGN::Pedigree::AddFamilyNames->new({
    chado_schema   => $schema,
    phenome_schema => $phenome_schema,
    dbh            => $dbh,
    cross_name     => 'cross_op',
    family_name    => 'family_cross_op',
    owner_name     => 'janedoe',
    family_type    => 'same_parents',
});
ok(my $return = $family_name_add->add_family_name(), 'Create family name');

# -----------------------------------------------------------------------------
# Create seedlots

# Create open-pollinated seedlot
my $seedlot_op = CXGN::Stock::Seedlot->new( schema => $schema);
$seedlot_op->uniquename("seedlot_cross_op");
$seedlot_op->location_code($location_name);
$seedlot_op->cross_stock_id($cross_op_id);
$seedlot_op->breeding_program_id($breeding_program_id);
ok($seedlot_op->store(), 'Create open-pollinated seedlot');

# Create biparental seedlot
my $seedlot_biparental = CXGN::Stock::Seedlot->new( schema => $schema);
$seedlot_biparental->uniquename("seedlot_cross_biparental");
$seedlot_biparental->location_code($location_name);
$seedlot_biparental->cross_stock_id($cross_biparental_id);
$seedlot_biparental->breeding_program_id($breeding_program_id);
ok($seedlot_biparental->store(), 'Create biparental seedlot');

# Create accession seedlot
my $test_accession_id = $schema->resultset('Stock::Stock')->find({ uniquename => 'test_accession1' })->stock_id;
my $seedlot_biparental = CXGN::Stock::Seedlot->new( schema => $schema);
$seedlot_biparental->uniquename("seedlot_accession");
$seedlot_biparental->location_code($location_name);
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
# Create trial multi upload file

my $trial_layout_csv = "
trial_name,breeding_program,location,year,transplanting_date,design_type,description,trial_type,trial_stock_type,plot_width,plot_length,field_size,planting_date,harvest_date,plot_name,accession_name,plot_number,block_number,is_a_control,rep_number,range_number,row_number,col_number,seedlot_name,num_seed_per_plot,weight_gram_seed_per_plot,entry_number
seedlot_trial,$breeding_program_name,$location_name,2026,,RCBD,Description of seedlot trial,misc_trial,accession,,,,,,seedlot_trial_plot_1,cross_op_accession_001,1,1,0,1,1,1,1,seedlot_cross_op,3,0,
seedlot_trial,$breeding_program_name,$location_name,2026,,RCBD,Description of seedlot trial,misc_trial,accession,,,,,,seedlot_trial_plot_2,cross_biparental_accession_001,2,1,0,2,1,1,2,seedlot_cross_biparental,3,0,
seedlot_trial,$breeding_program_name,$location_name,2026,,RCBD,Description of seedlot trial,misc_trial,accession,,,,,,seedlot_trial_plot_3,test_accession1,3,1,0,3,1,1,3,seedlot_accession,3,0,
";
my $trial_xlsx = '/tmp/accession_trial_layout_with_seedlot_from_cross.xlsx';
my $workbook  = Excel::Writer::XLSX->new($trial_xlsx);
my $worksheet = $workbook->add_worksheet();
my @csv_lines = split("\n", $trial_layout_csv);

my $row = 0;
foreach my $line (@csv_lines) {
    if (!$line) { next; }
    my @record = split(",", $line);
    my $col = 0;
    foreach my $value (@record) {
        $worksheet->write( $row, $col, $value );
        $col++;
    }
    $row++;
}
$workbook->close();
ok(-e $trial_xlsx, "Create trial multi upload xlsx");

# -----------------------------------------------------------------------------
# Upload trial

my $parser  = CXGN::Trial::ParseUpload->new(chado_schema=> $schema, filename => $trial_xlsx);
$parser->load_plugin('MultipleTrialDesignGeneric');
my $parsed_data = $parser->parse();
ok(unlink($trial_xlsx), 'Delete temporary trial xlsx');

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
ok($trial_create->save_trial(), "Create trial with 3 seeds per plot");

my $trial_id = $schema->resultset('Project::Project')->find({ name => 'seedlot_trial' })->project_id();

# -----------------------------------------------------------------------------
# Add seedlot to plots

# Write seedlot transactions to file
my $seedlot_upload_csv = "seedlot_name,plot_name,num_seed_per_plot,weight_gram_seed_per_plot,description
seedlot_cross_op,seedlot_trial_plot_1,10,,
seedlot_cross_biparental,seedlot_trial_plot_2,10,,
seedlot_accession,seedlot_trial_plot_3,10,,";
my $seedlot_file_path = my $trial_file_path = "/tmp/accession_trial_layout_with_seedlot_upload.csv";
open(FH, '>', $seedlot_file_path ) or die $!;
print FH $seedlot_upload_csv;
close(FH);

# Parse and upload the seed transactions to plots
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
    $transaction->description($data->{description});
    $transaction->timestamp($timestamp);
    $transaction->operator('janedoe');
    my $test_name = 'Plant 10 seeds from seedlot ' .  $data->{seedlot_name} . ' into plot ' . $data->{plot_name};
    ok($transaction->store(), $test_name);

    my $seedlot = CXGN::Stock::Seedlot->new(schema => $schema, seedlot_id => $data->{seedlot_stock_id});
    $seedlot->set_current_count_property();

    is($seedlot->get_current_count_property(), -13, "Seedlot count is -13 seeds for " . $data->{seedlot_name});
}

# -----------------------------------------------------------------------------
# Download Layout

my $layout_file_path = '/tmp/seedlot_trial_layout.csv';

my $download = CXGN::Trial::Download->new({
    bcs_schema => $schema,
    trial_id => $trial_id,
    filename => $layout_file_path,
    format => 'TrialLayoutCSV',
    data_level => 'plots',
    selected_columns => {
        "location_name"=>1,"trial_name"=>1,"plot_name"=>1,"plot_id"=>1,"plot_number"=>1,
        "row_number"=>1,"col_number"=>1,"accession_name"=>1,"seedlot_name"=>1,"num_seed_per_plot"=>1,
        "rep_number"=>1,"block_number"=>1,"is_a_control"=>1,"accession_id"=>1,
        "cross_unique_id"=>1,"family_name"=>1,
    },
});

ok(my $error = $download->download(), 'Download trial layout');

my $plot_1_id = $schema->resultset('Stock::Stock')->find({ name => 'seedlot_trial_plot_1' })->stock_id();
my $plot_2_id = $schema->resultset('Stock::Stock')->find({ name => 'seedlot_trial_plot_2' })->stock_id();
my $plot_3_id = $schema->resultset('Stock::Stock')->find({ name => 'seedlot_trial_plot_3' })->stock_id();

my $plot_1_accession_id = $schema->resultset('Stock::Stock')->find({ name => 'cross_op_accession_001' })->stock_id();
my $plot_2_accession_id = $schema->resultset('Stock::Stock')->find({ name => 'cross_biparental_accession_001' })->stock_id();
my $plot_3_accession_id = $schema->resultset('Stock::Stock')->find({ name => 'test_accession1' })->stock_id();

my $expected_csv = "plot_name,plot_id,accession_name,accession_id,plot_number,block_number,is_a_control,rep_number,row_number,col_number,seedlot_name,num_seed_per_plot,family_name,cross_unique_id,location_name,trial_name
seedlot_trial_plot_1,$plot_1_id,cross_op_accession_001,$plot_1_accession_id,1,1,,1,1,1,seedlot_cross_op,10,family_cross_op,cross_op,test_location,seedlot_trial
seedlot_trial_plot_2,$plot_2_id,cross_biparental_accession_001,$plot_2_accession_id,2,1,,2,1,2,seedlot_cross_biparental,10,,cross_biparental,test_location,seedlot_trial
seedlot_trial_plot_3,$plot_3_id,test_accession1,$plot_3_accession_id,3,1,,3,1,3,seedlot_accession,10,,,test_location,seedlot_trial";
my @expected = split "\n", $expected_csv;

# Read observed layout and remove quotations
# We remove quotations, because every single value is surrounded by double quotations (")
# which makes constructing the expected csv messy when inserting variables like plot id
my @observed = read_file($layout_file_path, chomp => 1);
foreach my $row (0 .. scalar @observed - 1){
    $observed[$row] = $observed[$row] =~ s/"//gr;
}
is_deeply(\@observed, \@expected, 'Trial layout has expected content');
ok(unlink($layout_file_path), 'Delete temporary trial layout file');

# -----------------------------------------------------------------------------
# Cleanup

$f->clean_up_db();
done_testing();
