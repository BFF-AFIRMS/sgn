
package CXGN::Trial::TrialLayout::AbstractLayout;

use Moose;
use namespace::autoclean;
use MooseX::FollowPBP;
use Moose::Util::TypeConstraints;
use Try::Tiny;
use JSON;
use Data::Dumper;

use CXGN::Stock::StockLookup;
use CXGN::Location::LocationLookup;
use SGN::Model::Cvterm;
use CXGN::Chado::Stock;


has 'schema' => (
    is       => 'rw',
    isa      => 'DBIx::Class::Schema',
    required => 1,
);

has 'trial_id' => (
    isa => 'Int',
    is => 'rw',
    predicate => 'has_trial_id',
    #trigger => \&_lookup_trial_id,
    required => 1
);

has 'experiment_type' => (
    is       => 'rw',
    isa     => 'Str', #field_layout or genotyping_layout or analysis_experiment
    required => 1,
);

has 'source_stock_types' => (isa => 'ArrayRef[Str]', is=> 'rw', default =>sub {  [ 'accession' ]  });  # what is being placed on the layout

has 'source_stock_type_ids' => (isa => 'ArrayRef[Int]', is => 'rw' );

has 'source_primary_stock_types' => (isa => 'ArrayRef[Str]', is=> 'rw', default =>sub {  [ 'accession' ]  });

has 'source_primary_stock_type_ids' => (isa => 'ArrayRef[Int]', is => 'rw' );

has 'target_stock_types' => (isa => 'ArrayRef[Str]', is => 'rw', default => sub { [ 'plot' ] }); # the object things are placed on, such as plot

has 'target_stock_type_ids' => (isa => 'ArrayRef[Int]', is => 'rw');

has 'relationship_types' => (isa => 'ArrayRef[Str]', is => 'rw', default => sub { [ 'plot_of' ] }); # relationship between source and target

has 'relationship_type_ids' => (isa => 'ArrayRef[Int]', is => 'rw');

# To verify that all plots in the trial have valid props and relationships. This means that the plots have plot_number and block_number properties. All plots have an accession associated. The plot's accession is in sync with any plant's accession, subplot's accession, and seedlot's containing accession. If verify_relationships is set to 1, then get_design will not return the design anymore, but will instead indicate any errors in the stored layout.
has 'verify_layout' => (isa => 'Bool', is => 'rw', predicate => 'has_verify_layout', reader => 'get_verify_layout');
# verify_physical_map checks that all plot's in the trial have row and column props.
has 'verify_physical_map' => (isa => 'Bool', is => 'rw', predicate => 'has_verify_physical_map', reader => 'get_verify_physical_map');


has 'project' => ( is => 'ro', isa => 'Bio::Chado::Schema::Result::Project::Project', reader => 'get_project', writer => '_set_project', predicate => 'has_project');

has 'design_type' => (isa => 'Str', is => 'ro', predicate => 'has_design_type', reader => 'get_design_type', writer => '_set_design_type');

has 'trial_year' => (isa => 'Str', is => 'ro', predicate => 'has_trial_year', reader => 'get_trial_year', writer => '_set_trial_year');

has 'trial_name' => (isa => 'Str', is => 'ro', predicate => 'has_trial_name', reader => 'get_trial_name', writer => '_set_trial_name');

has 'trial_description' => (isa => 'Str', is => 'ro', predicate => 'has_trial_description', reader => 'get_trial_description', writer => '_set_trial_description');

has 'trial_location' => (
    isa => 'Str',
    is => 'ro',
    predicate => 'has_trial_location', reader => 'get_trial_location', writer => '_set_trial_location',
    lazy     => 1,
    builder  => '_retrieve_trial_location',
);


has 'design' => (isa => 'HashRef', is => 'ro', predicate => 'has_design', reader => 'get_design', writer => '_set_design');

has 'plot_names' => (isa => 'ArrayRef', is => 'ro', predicate => 'has_plot_names', reader => 'get_plot_names', writer => '_set_plot_names', default => sub { [] } );


has 'replicate_numbers' => (isa => 'ArrayRef', is => 'ro', predicate => 'has_replicate_numbers', reader => 'get_replicate_numbers', writer => '_set_replicate_numbers');

has 'accession_names' => (isa => 'ArrayRef', is => 'ro', predicate => 'has_accession_names', reader => 'get_accession_names', writer => '_set_accession_names');
has 'analysis_result_stock_names' => (isa => 'ArrayRef', is => 'ro', predicate => 'has_analysis_result_stock_names', reader => 'get_analysis_result_stock_names', writer => '_set_analysis_result_stock_names');

has 'control_names' => (isa => 'ArrayRef', is => 'ro', predicate => 'has_control_names', reader => 'get_control_names', writer => '_set_control_names');

has 'row_numbers' => (isa => 'ArrayRef', is => 'rw', predicate => 'has_row_numbers', reader => 'get_row_numbers', writer => '_set_row_numbers');

has 'col_numbers' => (isa => 'ArrayRef', is => 'rw', predicate => 'has_col_numbers', reader => 'get_col_numbers', writer => '_set_col_numbers');

has 'cvterm_hash' => (isa => 'HashRef', is => 'rw');

sub BUILD {
    my $self = shift;
    my $args = shift;

    # print STDERR "Build CXGN::Trial::TrialLayout::AbstractLayout... ($args->{trial_id})\n";

    $self->_build_cvterm_hash();
}


sub cvterm_id {
    my $self = shift;
    my $term = shift;
    my $id =  $self->get_cvterm_hash->{$term};
    if (! $id) { die "The cvterm '$term' does not exist in the database!"; }
    return $id;
}

sub convert_source_stock_types_to_ids {
    my $self = shift;

    my @source_cvterm_ids;
    my @source_stocks = @{$self->get_source_stock_types()};

    foreach my $source_stock (@source_stocks) {
        push @source_cvterm_ids, $self->cvterm_id($source_stock);
    }

    $self->set_source_stock_type_ids(\@source_cvterm_ids);

    my @source_primary_cvterm_ids;
    my @primary_source_stocks = @{$self->get_source_primary_stock_types()};

    foreach my $source_stock (@primary_source_stocks) {
        push @source_primary_cvterm_ids, $self->cvterm_id($source_stock);
    }

    $self->set_source_primary_stock_type_ids(\@source_primary_cvterm_ids);

    my @target_cvterm_ids;
    foreach my $target_stock (@{$self->get_target_stock_types()}) {
        push @target_cvterm_ids, $self->cvterm_id($target_stock);
    }

    $self->set_target_stock_type_ids(\@target_cvterm_ids);

    my @rel_type_cvterm_ids;
    foreach my $rel_type (@{$self->get_relationship_types()}) {
        push @rel_type_cvterm_ids, $self->cvterm_id($rel_type);
    }

    $self->set_relationship_type_ids(\@rel_type_cvterm_ids);
}


sub _lookup_trial_id {
    my $self = shift;
    print STDERR "CXGN::Trial::TrialLayout AbstractLayout _lookup_trial_id() ".localtime."\n";
    $self->get_schema->storage->dbh->do('SET search_path TO public,sgn');

    #print STDERR "Check 2.1: ".localtime()."\n";
    $self->_set_project_from_id();
    if (!$self->has_project()) {
        print STDERR "Trial id not found\n";
        return;
    }

    if (!$self->_get_trial_year_from_project()) {
        print STDERR "Trial has no associated trial year... quitting!\n";
    #return;
    } else {
            $self->_set_trial_year($self->_get_trial_year_from_project());
    }

    $self->_set_trial_name($self->get_project->name());
    $self->_set_trial_description($self->get_project->description());

    if (!$self->_get_design_type_from_project()) {
        print STDERR "Trial has no design type... not creating layout object.\n";
        return;
    }

    $self->_set_design_type($self->_get_design_type_from_project());
    $self->_set_design($self->_get_design_from_trial());
    # print STDERR "DESIGN: ".Dumper($design)."\n";

    $self->_set_plot_names($self->_get_plot_info_fields_from_trial("plot_name") || []);
    # moved to subclass  $self->_set_block_numbers($self->_get_plot_info_fields_from_trial("block_number") || []);
    $self->_set_replicate_numbers($self->_get_plot_info_fields_from_trial("rep_number") || []);
    $self->_set_row_numbers($self->_get_plot_info_fields_from_trial("row_number") || [] );
    $self->_set_col_numbers($self->_get_plot_info_fields_from_trial("col_number") || [] );
    $self->_set_accession_names($self->_get_unique_accession_names_from_trial() || []);        
    $self->_set_control_names($self->_get_unique_control_accession_names_from_trial() || []);
    $self->set_analysis_result_stock_names();
    
    print STDERR "CXGN::Trial::TrialLayout End Build".localtime."\n";
}

sub set_analysis_result_stock_names {
    my $self = shift;
    my %design = %{$self->get_design()};
    my $design_key = (keys %design)[0];
    my $sample_entry = $design{$design_key};
    if ($sample_entry->{'analysis_result_stock_id'}) {
        print STDERR "SETTING ANALYSIS RESULT STOCK NAMES\n";
        $self->_set_analysis_result_stock_names($self->_get_unique_analysis_result_stock_names_from_trial() || []);
        $self->_set_accession_names([]);        
        $self->_set_control_names([]);
    } 

}

sub _retrieve_trial_location {
    my $self = shift;
    if (!$self->_get_location_from_field_layout_experiment()) {
        print STDERR "Trial has no location.\n";
        return;
    } else {
        $self->_set_trial_location($self->_get_location_from_field_layout_experiment());
    }
}

sub _get_control_plot_names_from_trial {
  my $self = shift;
  my %design = %{$self->get_design()};
  my @control_names;
  foreach my $key (sort { $a <=> $b} keys %design) {
    my %design_info = %{$design{$key}};
    my $is_a_control;
    $is_a_control = $design_info{"is_a_control"};
    if ($is_a_control) {
      push(@control_names, $design_info{"plot_name"});
    }
  }
  if (! scalar(@control_names) >= 1){
    return;
  }
  return \@control_names;
}

sub _get_unique_accession_names_from_trial {
    my $self = shift;
    my %design = %{$self->get_design()};
    my @acc_names;
    my %unique_acc;
    no warnings 'numeric'; #for genotyping plate so that wells don't give warning

    # print STDERR "DESIGN (AbstractTrial): ".Dumper(\%design);
    foreach my $key (sort { $a <=> $b} keys %design) {
        my %design_info = %{$design{$key}};
        $unique_acc{$design_info{"accession_name"}} = $design_info{"accession_id"};
        if ( defined $design_info{"intercrop_accessions"} ) {
            foreach my $a (@{$design_info{"intercrop_accessions"}} ) {
                $unique_acc{$a->{"accession_name"}} = $a->{"accession_id"};
            }
        }
    }

    foreach (sort keys %unique_acc){
        push @acc_names, {accession_name=>$_, stock_id=>$unique_acc{$_}};
    }

    if (!scalar(@acc_names) >= 1){
        return;
    }

    return \@acc_names;
}

sub _get_unique_analysis_result_stock_names_from_trial {
    my $self = shift;
    my %design = %{$self->get_design()};
    my @analysis_result_stock_names;
    my %unique_analysis_result_stock_names;
    no warnings 'numeric'; #for genotyping plate so that wells don't give warning

    foreach my $key (sort { $a <=> $b} keys %design) {
        my %design_info = %{$design{$key}};    
        $unique_analysis_result_stock_names{$design_info{"analysis_result_stock_name"}} = $design_info{"analysis_result_stock_id"}
    }

    foreach (sort keys %unique_analysis_result_stock_names){
        push @analysis_result_stock_names, {analysis_result_stock_name=>$_, stock_id=>$unique_analysis_result_stock_names{$_}};
    }

    if (!scalar(@analysis_result_stock_names) >= 1){
        return;
    }

    return \@analysis_result_stock_names;
}

sub _get_unique_control_accession_names_from_trial {
    my $self = shift;
    my %design = %{$self->get_design()};
    my @control_names;
    my %unique_controls;
    no warnings 'numeric'; #for genotyping plate so that wells don't give warning

    foreach my $key (sort { $a <=> $b} keys %design) {
        my %design_info = %{$design{$key}};
        my $is_a_control = $design_info{"is_a_control"};
        if ($is_a_control) {
            $unique_controls{$design_info{"accession_name"}} = $design_info{"accession_id"}
        }
    }

    foreach (sort keys %unique_controls){
        push @control_names, {accession_name=>$_, stock_id=>$unique_controls{$_}};
    }

    if (!scalar(@control_names) >= 1){
        return;
    }

    return \@control_names;
}

sub _get_plot_info_fields_from_trial {
    my $self = shift;
    my $field_name = shift;
    my %design = %{$self->get_design()};
    my @field_values;
    my %unique_field_values;
    foreach my $key (sort { $a cmp $b} keys %design) {
	my %design_info = %{$design{$key}};
	if (exists($design_info{$field_name})) {
	    if (! exists($unique_field_values{$design_info{$field_name}})) {
		#print STDERR "pushing $design_info{$field_name}...\n";
		push(@field_values, $design_info{$field_name});
	    }
	    $unique_field_values{$design_info{$field_name}} = 1;
	}
    }

    if (! scalar(@field_values) >= 1){
	return;
    }
    return \@field_values;
}


sub _get_design_from_trial {
    print STDERR "Check 2.3.4.1: ".localtime()."\n";
    my $self = shift;
    my $schema = $self->get_schema();
    my $project = $self->get_project();

    #Try to retrieve layout from cached json
    #my $trial_layout_json_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'trial_layout_json', 'project_property')->cvterm_id;
    #my $trial_has_plants_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'project_has_plant_entries', 'project_property')->cvterm_id;
    my $trial_layout_json = $project->projectprops->find({ 'type_id' => $self->cvterm_id('trial_layout_json') });
    my $trial_has_plants = $project->projectprops->find({ 'type_id' => $self->cvterm_id('project_has_plant_entries') });

    my $design;

    if ($trial_layout_json) {
        $design = decode_json $trial_layout_json->value;
    }
    # print STDERR "\n_get_design_from_trial design: ".Dumper($design)."\n";
    if (keys(%$design)) {
        # print STDERR "WE HAVE TRIAL LAYOUT JSON!\n";
	    # print STDERR "TRIAL LAYOUT JSON IS: ".$trial_layout_json->value()."\n";

	    #Plant index number needs to be in the cached layout of trials that have plants. this serves a check to assure this.
	    if ($trial_has_plants){
		my @plot_values = values %$design;
		if (!exists($plot_values[0]->{plant_index_numbers})) {
		    print STDERR "Regenerating cache to include plants...\n";
		    $self->generate_and_cache_layout();
		} else {
		    print STDERR "TrialLayout from cache ".localtime."\n";
		    return $design;
		}
	    } else {
            print STDERR "TrialLayout from cache ".localtime."\n";
            return $design;
	    }
	} else {
	print STDERR "Regenerating cache...\n";
        my $design = $self->generate_and_cache_layout();
	    # print STDERR "_get_design_from_trial Generated DESIGN (and cached) : ".Dumper($design);
	return $design;
    }
}

sub generate_and_cache_layout {
    my $self = shift;
    print STDERR "TrialLayout generate layout ".localtime."\n";
    my $schema = $self->get_schema();
    my $plots_ref;
    my @plots;
    my %verify_errors;
    my %unique_accessions;
    my %unique_controls;
    my $project = $self->get_project();

    print STDERR "_get_plots\n";
    $plots_ref = $self->_get_plots();
    if (!$plots_ref) {
      print STDERR "_get_design_from_trial: not plots provided... returning.\n";
      return { error => "Something went wrong retrieving plots for this trial. This should not happen, so please contact us." };
  }
#print STDERR "Check 2.3.4.2: ".localtime()."\n";

    # my $genotyping_user_id;
    # my $genotyping_project_name;
    # if ($self->get_experiment_type eq 'genotyping_trial'){
    #     my $genotyping_user_id_row = $project
    #         ->search_related("nd_experiment_projects")
    #         ->search_related("nd_experiment")
    #         ->search_related("nd_experimentprops")
    #         ->find({ 'type.name' => 'genotyping_user_id' }, {join => 'type' });
    #     $genotyping_user_id = $genotyping_user_id_row->get_column("value") || "unknown";

    #     my $genotyping_project_name_row = $project
    #         ->search_related("nd_experiment_projects")
    #         ->search_related("nd_experiment")
    #         ->search_related("nd_experimentprops")
    #         ->find({ 'type.name' => 'genotyping_project_name' }, {join => 'type' });
    #     $genotyping_project_name = $genotyping_project_name_row->get_column("value") || "unknown";
    # }

    @plots = @{$plots_ref};

    my %design;

    #print STDERR "PLOTS: ".Dumper(\@plots);
    my $design = $self->retrieve_plot_info(\@plots);

    #print STDERR "DESIGN IN generate_and_cache_layout: ".Dumper(\%design);

    my $trial_layout_json_rs = $project->search_related('projectprops',{ 'type_id' => $self->cvterm_id('trial_layout_json') });
    while (my $t = $trial_layout_json_rs->next) {
        $t->delete();
    }

    $project->create_projectprops({
        'trial_layout_json' => encode_json($design)
				  });

    if ($self->get_verify_layout || $self->get_verify_physical_map){
        return \%verify_errors;
    }

    #print STDERR "DESIGN AS READ : ".Dumper(\%design);

    return $design;
}

sub retrieve_plot_info {
    my $self = shift;
    my $plots = shift;

    my $design_info;
    my $verify_errors;
    my $schema = $self->get_schema();
    my $source_primary_stock_type_ids = $self->get_source_primary_stock_type_ids();
    my $relationship_type_ids = $self->get_relationship_type_ids();

    # cvterm stock types
    my $subplot_cvterm_id = $self->cvterm_id('subplot');
    my $accession_cvterm_id = $self->cvterm_id('accession');
    my $plant_cvterm_id = $self->cvterm_id('plant');
    my $tissue_sample_cvterm_id = $self->cvterm_id('tissue_sample');
    my $seedlot_cvterm_id = $self->cvterm_id('seedlot');

    # cvterm stock relationships
    my $intercrop_plot_of_cvterm_id = $self->cvterm_id('intercrop_plot_of');
    my $plot_of_cvterm_id = $self->cvterm_id('plot_of');
    my $subplot_of_cvterm_id = $self->cvterm_id('subplot_of');
    my $plant_of_cvterm_id = $self->cvterm_id('plant_of');
    my $plant_of_subplot_cvterm_id = $self->cvterm_id('plant_of_subplot');
    my $tissue_sample_of_cvterm_id = $self->cvterm_id('tissue_sample_of');
    my $seed_transaction_cvterm_id = $self->cvterm_id('seed transaction');

    # cvterm trial layout
    my $plot_number_cvterm_id = $self->cvterm_id('plot number');
    my $rep_number_cvterm_id = $self->cvterm_id('replicate');
    my $block_number_cvterm_id = $self->cvterm_id('block');
    my $row_number_cvterm_id = $self->cvterm_id('row_number');
    my $col_number_cvterm_id = $self->cvterm_id('col_number');
    my $range_number_cvterm_id = $self->cvterm_id('range');
    my $stake_number_cvterm_id = $self->cvterm_id('stake_number');
    my $set_number_cvterm_id = $self->cvterm_id('set_number');
    my $plot_geo_json_cvterm_id = $self->cvterm_id('plot_geo_json');
    my $concentration_cvterm_id = $self->cvterm_id('concentration');
    my $volume_cvterm_id = $self->cvterm_id('volume');
    my $dna_person_cvterm_id = $self->cvterm_id('dna_person');
    my $extraction_cvterm_id = $self->cvterm_id('extraction');
    my $tissue_type_cvterm_id = $self->cvterm_id('tissue_type');
    my $acquisition_date_cvterm_id = $self->cvterm_id('acquisition date');
    my $notes_cvterm_id = $self->cvterm_id('notes');
    my $facility_identifier_cvterm_id = $self->cvterm_id('facility_identifier');
    my $ncbi_taxonomy_id_cvterm_id = $self->cvterm_id('ncbi_taxonomy_id');
    my $is_blank_cvterm_id = $self->cvterm_id('is_blank');
    my $is_a_control_cvterm_id = $self->cvterm_id('is a control');
    my $analysis_result_cvterm_id = $self->cvterm_id('analysis_result');
    my $subplot_index_number_cvterm_id = $self->cvterm_id('subplot_index_number');
    my $plant_index_number_cvterm_id = $self->cvterm_id('plant_index_number');
    my $tissue_sample_index_number_cvterm_id = $self->cvterm_id('tissue_sample_index_number');

    # Convert our input plots to a list of plot stock ids for db queries
    my @plot_ids;
    foreach my $plot (@$plots){
        push @plot_ids, $plot->stock_id();
    }
    # Prepare a DB resultset that we can re-use to search for plots
    my $plots_rs = $schema->resultset('Stock::Stock')
        ->search({'me.stock_id' => { -in => \@plot_ids}});

    # Add basic design info about the plot_id and plot_name
    while (my $record = $plots_rs->next){
        my $plot_id = $record->stock_id();
        my $plot_name = $record->uniquename();
        $design_info->{$plot_id}->{plot_id} = $plot_id;
        $design_info->{$plot_id}->{plot_name} = $plot_name;
    }

    # -------------------------------------------------------------------------
    # Get parent relationships (accession/cross/family_names)

    # Get accessions/crosses/family_names of plots
    my $parents;
    my $parents_rs = $plots_rs
        ->search_related(
            'stock_relationship_subjects',
            {
                'stock_relationship_subjects.type_id' => { -in => \@$relationship_type_ids },
                'object.type_id' => { -in => \@$source_primary_stock_type_ids }
            },
            { 'join' => 'object' }
	    );
    while (my $record = $parents_rs->next){
        my $plot_id = $record->subject_id();
        my $parent = $record->object;
        push @{$parents->{$plot_id}}, {
            name => $parent->uniquename(),
            id => $parent->stock_id(),
            type_id => $parent->type_id(),
        };
    }
    # Validate each plot is linked to exactly one parent (accession/cross/family_name)
    foreach my $plot_id (@plot_ids){
        my $plot_parents = $parents->{$plot_id};
        if (! defined $plot_parents){
            die "There is no accession/cross/family_name linked to plot: $plot_id\n";
        }
        if (scalar(@$plot_parents) > 1){
            die "There is more than one accession/cross/family_name linked to plot: $plot_id\n";
        }
        $parents->{$plot_id} = $parents->{$plot_id}->[0];
    }

    # -------------------------------------------------------------------------
    # Get intercrop parent relationships (accession/cross/family_names)
 
    my $intercrop_parents;
    my $intercrop_parents_rs = $plots_rs
        ->search_related(
            'stock_relationship_subjects',
            {
                'stock_relationship_subjects.type_id' => $intercrop_plot_of_cvterm_id,
                'object.type_id' => { -in => \@$source_primary_stock_type_ids }
            },
            { 'join' => 'object' }
	    );
    while (my $record = $intercrop_parents_rs->next){
        my $plot_id = $record->subject_id();
        my $intercropped_parent = $record->object;

        push @{$design_info->{$plot_id}->{intercrop_accessions}}, {
            accession_name => $intercropped_parent->uniquename(),
            accession_id => $intercropped_parent->stock_id(),
        };
    }

    # -------------------------------------------------------------------------
    # Get child relationships
    # -------------------------------------------------------------------------

    # -------------------------------------------------------------------------
    # Subplots

    my $query = "
    select plot.stock_id, subplot.stock_id, subplot.uniquename, subplot_parent.parent_id, index_number.value, plant.uniquename, tissue_sample.uniquename
    from stock as plot
    join stock_relationship as plot_to_subplot on (plot.stock_id = plot_to_subplot.subject_id and plot_to_subplot.type_id = $subplot_of_cvterm_id)
    join stock as subplot on (subplot.stock_id = plot_to_subplot.object_id)
    join stockprop as index_number on (subplot.stock_id = index_number.stock_id and index_number.type_id = $subplot_index_number_cvterm_id)
    left join stock_relationship as subplot_to_plant on ( subplot.stock_id = subplot_to_plant.object_id and subplot_to_plant.type_id = $plant_of_subplot_cvterm_id)
    left join stock as plant on (plant.stock_id = subplot_to_plant.subject_id)
    left join stock_relationship as plant_to_tissue_sample on (plant.stock_id = plant_to_tissue_sample.object_id and plant_to_tissue_sample.type_id = $tissue_sample_of_cvterm_id)
    left join stock as tissue_sample on (tissue_sample.stock_id = plant_to_tissue_sample.subject_id)
    left join (
        select subject_id as subplot_id, object_id as parent_id
        from stock_relationship
        join stock on (subject_id = stock_id and stock.type_id = any (?))
    ) as subplot_parent on (subplot.stock_id = subplot_parent.subplot_id)
    where plot.stock_id = any (?);
    ";

    my $sth = $schema->storage()->dbh()->prepare($query);
    $sth->execute(\@$source_primary_stock_type_ids, \@plot_ids);
    while (my ($plot_id, $subplot_id, $subplot_name, $subplot_parent_id, $index_number, $plant_name, $tissue_sample_name) = $sth->fetchrow_array()) {
        # TBD: Validate that a subplot is not associated with multiple index numbers?
        $design_info->{$plot_id}->{subplot_ids}->{$subplot_id} = 1;
        $design_info->{$plot_id}->{subplot_names}->{$subplot_name} = 1;
        $design_info->{$plot_id}->{subplot_index_numbers}->{$index_number} = 1;
        $design_info->{$plot_id}->{subplots_plant_names}->{$subplot_name}->{$plant_name} = 1;
        push @{$design_info->{$plot_id}->{subplots_tissue_sample_names}->{$subplot_name}}, $tissue_sample_name;
        # Optional validation, check if subplot parent is same as plot parent
        if ($self->get_verify_layout){
            my $plot_parent_id = $parents->{$plot_id}->{id};
            if ( $plot_parent_id != $subplot_parent_id ){
                push @{$verify_errors->{errors}->{layout_errors}}, "Subplot: subplot_name does not have the same parent: $subplot_parent_id as the plot: $plot_parent_id.";
            }
        }
    }
    # Convert unique hashes to arrays, since our query involves a one->many
    # relationship of subplots to plants and tissue samples
    foreach my $plot_id (keys %$design_info){
        foreach my $key ('subplot_ids', 'subplot_names', 'subplot_index_numbers') {
            my $values = $design_info->{$plot_id}->{$key};
            # Currently, tests expect plots missing subplots to be undef;
            if (defined $values){
                my @entries = keys %$values;
                $design_info->{$plot_id}->{$key} = \@entries;
            }
        }
        # handle deeper nesting of subplots_plant_names
        my $subplots_plant_names = $design_info->{$plot_id}->{subplots_plant_names};
        foreach my $subplot_name (keys %$subplots_plant_names){
            my @plant_names = keys %{$subplots_plant_names->{$subplot_name}};
            $design_info->{$plot_id}->{subplots_plant_names}->{$subplot_name} = \@plant_names;
        }
    }

    # -------------------------------------------------------------------------
    # Plants

    my $query = "
    select plot.stock_id, plant.stock_id, plant.uniquename, plant_parent.parent_id, index_number.value, tissue_sample.uniquename
    from stock as plot
    join stock_relationship as plot_to_plant on (plot.stock_id = plot_to_plant.subject_id and plot_to_plant.type_id = $plant_of_cvterm_id)
    join stock as plant on (plant.stock_id = plot_to_plant.object_id)
    join stockprop as index_number on (index_number.stock_id = plant.stock_id and index_number.type_id = $plant_index_number_cvterm_id)
    join (
        select subject_id as plant_id, object_id as parent_id
        from stock_relationship
        join stock on (object_id = stock_id and stock.type_id = any(?))
    ) as plant_parent on (plant.stock_id = plant_parent.plant_id)
    left join stock_relationship as plant_to_tissue_sample on (plant.stock_id = plant_to_tissue_sample.object_id and plant_to_tissue_sample.type_id = $tissue_sample_of_cvterm_id)
    left join stock as tissue_sample on (tissue_sample.stock_id = plant_to_tissue_sample.subject_id)
    where plot.stock_id = any (?);";

    my $sth = $schema->storage()->dbh()->prepare($query);
    $sth->execute(\@$source_primary_stock_type_ids, \@plot_ids);
    while (my ($plot_id, $plant_id, $plant_name, $plant_parent_id, $index_number, $tissue_sample_name) = $sth->fetchrow_array()) {
        # TBD: Validate that a plant is not associated with multiple numbers?
        $design_info->{$plot_id}->{plant_ids}->{$plant_id} = 1;
        $design_info->{$plot_id}->{plant_names}->{$plant_name} = 1;
        $design_info->{$plot_id}->{plant_index_numbers}->{$index_number} = 1;
        if (defined $tissue_sample_name){
            push @{$design_info->{$plot_id}->{plants_tissue_sample_names}->{$plant_name}}, $tissue_sample_name;
        }
        # Optional validation, check if plant parent is same as plot parent
        if ($self->get_verify_layout){
            my $plot_parent_id = $parents->{$plot_id}->{id};
            if ( $plot_parent_id != $plant_parent_id ){
                push @{$verify_errors->{errors}->{layout_errors}}, "Plant: $plant_name does not have the same parent: $plant_parent_id as the plot: $plot_parent_id.";
            }
        }
    }
    # Convert unique hashes to arrays, since our query involves a one->many
    # relationship of plants to tissue samples
    foreach my $plot_id (keys %$design_info){
        foreach my $key ('plant_ids', 'plant_names', 'plant_index_numbers') {
            my @values = keys %{$design_info->{$plot_id}->{$key}};
            $design_info->{$plot_id}->{$key} = \@values;
        }
        # Initialize plants with no tissue samples to an empty array
        foreach my $key ('plants_tissue_sample_names'){
            my $values = $design_info->{$plot_id}->{$key};
            if (! defined $values){
                $design_info->{$plot_id}->{$key} = {};
            }
        }
    }

    # -------------------------------------------------------------------------
    # Tissue Samples

    my $query = "
    select plot.stock_id, tissue_sample.stock_id, tissue_sample.uniquename, tissue_sample_parent.parent_id, index_number.value
    from stock as plot
    join stock_relationship as plot_to_tissue_sample on (plot.stock_id = plot_to_tissue_sample.object_id and plot_to_tissue_sample.type_id = $tissue_sample_of_cvterm_id)
    join stock as tissue_sample on (tissue_sample.stock_id = plot_to_tissue_sample.subject_id)
    join stockprop as index_number on (tissue_sample.stock_id = index_number.stock_id and index_number.type_id = $tissue_sample_index_number_cvterm_id)
    left join (
        select subject_id as tissue_sample_id, object_id as parent_id
        from stock_relationship
        join stock on (object_id = stock_id and stock.type_id = any (?))
    ) as tissue_sample_parent on (tissue_sample.stock_id = tissue_sample_parent.tissue_sample_id)
    where plot.stock_id = any (?);";

    my $sth = $schema->storage()->dbh()->prepare($query);
    $sth->execute(\@$source_primary_stock_type_ids, \@plot_ids);

    while (my ($plot_id, $tissue_sample_id, $tissue_sample_name, $tissue_sample_parent_id, $index_number) = $sth->fetchrow_array()) {
        # TBD: Validate that a tissue sample is not associated with multiple numbers?
        push @{$design_info->{$plot_id}->{tissue_sample_ids}}, $tissue_sample_id;
        push @{$design_info->{$plot_id}->{tissue_sample_names}}, $tissue_sample_name;
        push @{$design_info->{$plot_id}->{tissue_sample_index_numbers}}, $index_number;
        # Optional validation, check if tissue sample parent is same as plot parent
        if ($self->get_verify_layout){
            my $plot_parent_id = $parents->{$plot_id}->{id};
            if ( $plot_parent_id != $tissue_sample_parent_id ){
                push @{$verify_errors->{errors}->{layout_errors}}, "Tissue Sample: $tissue_sample_name does not have the same parent: $tissue_sample_parent_id as the plot: $plot_parent_id.";
            }
        }
    }

    # Initialize missing tissue_sample keys to empty array
    foreach my $plot_id (@plot_ids){
        foreach my $key ('tissue_sample_ids', 'tissue_sample_names', 'tissue_sample_index_numbers') {
            if (! defined $design_info->{$plot_id}->{$key}){
                $design_info->{$plot_id}->{$key} = [];
            }
        }
    }

    # -------------------------------------------------------------------------
    # Seedlots

    my $query = "
    select plot.stock_id, seedlot.uniquename, seedlot.stock_id, seedlot_parent.parent_id, plot_to_seedlot.value
    from stock as plot
    join stock_relationship as plot_to_seedlot on (plot.stock_id = plot_to_seedlot.subject_id and plot_to_seedlot.type_id = $seed_transaction_cvterm_id)
    join stock as seedlot on (seedlot.stock_id = plot_to_seedlot.object_id)
    left join (
        select subject_id as seedlot_id, object_id as parent_id
        from stock_relationship
        join stock on (object_id = stock_id and stock.type_id = any (?))
    ) as seedlot_parent on (seedlot.stock_id = seedlot_parent.seedlot_id)
    where plot.stock_id = any (?);";

    my $sth = $schema->storage()->dbh()->prepare($query);
    $sth->execute(\@$source_primary_stock_type_ids, \@plot_ids);
    while (my ($plot_id, $seedlot_name, $seedlot_id, $seedlot_parent_id, $transaction_string) = $sth->fetchrow_array()) {

        my $transaction = decode_json $transaction_string;
        $design_info->{$plot_id}->{"seedlot_name"} = $seedlot_name;
        $design_info->{$plot_id}->{"seedlot_stock_id"} = $seedlot_id;
        $design_info->{$plot_id}->{"num_seed_per_plot"} = $transaction->{amount};
        $design_info->{$plot_id}->{"weight_gram_seed_per_plot"} = $transaction->{weight_gram};
        $design_info->{$plot_id}->{"seed_transaction_operator"} = $transaction->{operator};

        # # Optional validation, check if seedlot parent is same as plot parent
        if ($self->get_verify_layout){
            my $plot_parent_id = $parents->{$plot_id}->{id};
            if ( $plot_parent_id != $seedlot_parent_id ){
                push @{$verify_errors->{errors}->{layout_errors}}, "Seedlot: $seedlot_name does not have the same parent: $seedlot_parent_id as the plot: $plot_parent_id.";
            }
        }
    }

    # Optional validation: report if any plot isn't linked to a seedlot
    if ($self->get_verify_layout){
        foreach my $plot_id (keys %$design_info){
            my $plot_seedlot = $design_info->{$plot_id}->{"seedlot_name"};
            if (! defined $plot_seedlot){
                push @{$verify_errors->{errors}->{seedlot_errors}}, "Plot: $plot_id does not have a seedlot linked.";
            }
        }
    }

    # -------------------------------------------------------------------------
    # Create the final design_info object

    # Fetch stockprops of plots
    my $stockprops;
    my $stockprops_rs = $schema->resultset('Stock::Stockprop')
        ->search({'me.stock_id' => {-in => \@plot_ids}});
    while (my $record = $stockprops_rs->next){
        my $plot_id = $record->stock_id();
        my $type_id = $record->type_id();
        my $value = $record->value();
        push @{$stockprops->{$plot_id}->{$type_id}}, $value;
    }

    # Validate stockprops, then convert values to comma separated

    # Create a map of plot ids to plot numbers, we will need this
    # because the final return object needs the plot numbers to be
    # the keys in the hash
    my $plot_ids_to_plot_numbers = {};

    foreach my $plot_id (keys %$stockprops){

        # Validate required values from stockprops
        my $plot_number = $stockprops->{$plot_id}->{$plot_number_cvterm_id};
        if (!defined $plot_number){ die "no plot number stockprop found for plot: $plot_id"; }
        my $plot_number = join(',', @$plot_number);
        $plot_ids_to_plot_numbers->{$plot_id} = $plot_number;
        $design_info->{$plot_id}->{plot_number} = $plot_number;

        # Add design keys based on whether this is/isn't an analysis result
        my $parent_data = $parents->{$plot_id};
        if ($parent_data->{type_id} == $analysis_result_cvterm_id){
            $design_info->{$plot_id}->{analysis_result_stock_name} = $parent_data->{name};
            $design_info->{$plot_id}->{analysis_result_stock_id} = $parent_data->{id};
        } else {
            $design_info->{$plot_id}->{accession_name} = $parent_data->{name};
            $design_info->{$plot_id}->{accession_id} = $parent_data->{id};
        }

        # Process optional values from stockprops
        foreach my $type_id (keys %{$stockprops->{$plot_id}}){
            my @values = @{$stockprops->{$plot_id}->{$type_id}};
            my $formatted_values = join(',', @values);

            my $design_info_key;
            if    ($type_id == $rep_number_cvterm_id )        { $design_info_key = "rep_number"; }
            elsif ($type_id == $block_number_cvterm_id )      { $design_info_key = "block_number"; }
            elsif ($type_id == $row_number_cvterm_id )        { $design_info_key = "row_number"; }
            elsif ($type_id == $col_number_cvterm_id )        { $design_info_key = "col_number"; }
            elsif ($type_id == $range_number_cvterm_id )      { $design_info_key = "range_number"; }
            elsif ($type_id == $stake_number_cvterm_id )      { $design_info_key = "stake_number"; }
            elsif ($type_id == $set_number_cvterm_id )        { $design_info_key = "set_number"; }
            elsif ($type_id == $concentration_cvterm_id)      { $design_info_key = "concentration"; }
            elsif ($type_id == $volume_cvterm_id)             { $design_info_key = "volume"; }
            elsif ($type_id == $dna_person_cvterm_id)         { $design_info_key = "dna_person"; }
            elsif ($type_id == $extraction_cvterm_id)         { $design_info_key = "extraction"; }
            elsif ($type_id == $tissue_type_cvterm_id)        { $design_info_key = "tissue_type"; }
            elsif ($type_id == $acquisition_date_cvterm_id)   { $design_info_key = "acquisition_date"; }
            elsif ($type_id == $notes_cvterm_id)              { $design_info_key = "notes"; }
            elsif ($type_id == $facility_identifier_cvterm_id){ $design_info_key = "facility_identifier"; }
            elsif ($type_id == $ncbi_taxonomy_id_cvterm_id)   { $design_info_key = "ncbi_taxonomy_id"; }
            # Special values
            elsif ($type_id == $plot_geo_json_cvterm_id){
                $design_info_key = "plot_geo_json";
                $formatted_values = decode_json $values[0];
            }
            elsif ($type_id == $is_blank_cvterm_id  ){
                $design_info_key = "is_blank";
                $formatted_values = $formatted_values ? 1 : 0;
            }
            elsif ($type_id == $is_a_control_cvterm_id  ){
                $design_info_key = "is_a_control";
                $formatted_values = $formatted_values ? 1 : 0;
            }
        
            # Add values to design information
            if ($design_info_key){
                $design_info->{$plot_id}->{$design_info_key} = $formatted_values;
            }
        }

        # Optional validation of the layout
        if ($self->get_verify_layout){
            # No block number
            if (!defined $design_info->{$plot_id}->{block_number}){
                push @{$verify_errors->{errors}->{layout_errors}}, "Plot: $plot_id does not have a block_number!";
            }
        }

        if ($self->get_verify_physical_map){
            my $row_number = $design_info->{$plot_id}->{row_number};
            my $col_number = $design_info->{$plot_id}->{col_number};
            if (!defined $row_number || ! defined $col_number){
                push @{$verify_errors->{errors}->{physical_map_errors}}, "Plot: $plot_id does not have a row_number and/or col_number!";
            }
        }
    }

    # Convert the keys in the hash from plot_ids to plot_numbers
    my $final_design_info = {};
    foreach my $plot_id (keys %$design_info){
        my $plot_number = $plot_ids_to_plot_numbers->{$plot_id};
        $final_design_info->{$plot_number} = $design_info->{$plot_id};
    }

    return $final_design_info;

}

sub _get_field_layout_experiment_from_project {
    my $self = shift;
    my $project;
    my $field_layout_experiment;
    $project = $self->get_project();
    if (!$project) {
	die "No project found for this instance!!!!\n";
	return;
    }
    $field_layout_experiment = $project
	->search_related("nd_experiment_projects")
	->search_related("nd_experiment")
   	->find({ 'type.name' => { in => ['field_layout', 'genotyping_layout', 'genotyping_experiment', 'treatment_experiment', 'analysis_experiment', 'sampling_layout']} }, {join => 'type' } );
    return $field_layout_experiment;
}


sub _get_location_from_field_layout_experiment {
    my $self = shift;
    my $field_layout_experiment;
    my $location_name;
    $field_layout_experiment = $self -> _get_field_layout_experiment_from_project();
    if (!$field_layout_experiment) {
	print STDERR "No field layout detected for this trial.\n";
	return;
    }
    $location_name = $field_layout_experiment -> nd_geolocation -> description();
    #print STDERR "Location: $location_name\n";
    return $location_name;
}


sub _set_project_from_id {
    my $self = shift;
    my $schema = $self->get_schema();
    my $project;
    if (!$self->has_trial_id()) {
	return;
    }
    $project = $schema->resultset('Project::Project')->find({project_id => $self->get_trial_id()});
    if (!$project) {
	return;
    }
    $self->_set_project($project);
}

sub _get_design_type_from_project {
    my $self = shift;
    my $design_prop;
    my $design_type;
    my $project;

    if (!$self->has_trial_id()) {
	print STDERR "Have no trial_id, aborting...\n";
	return;
    }
    $project = $self->get_project();
    if (!$project) {
	print STDERR "Have no project row, aborting...\n";
	return;
    }
    $design_prop =  $project->projectprops->find(
        { 'type.name' => 'design' },
        { join => 'type'}
        ); #there should be only one design prop.
    if (!$design_prop) {
	return;
    }
    $design_type = $design_prop->value;
    if (!$design_type) {
	return;
    }
    return $design_type;
}

sub _get_trial_year_from_project {
    my $self = shift;
    my $project;
    my $year_prop;
    my $year;

    if (!$self->has_trial_id()) {
	return;
    }
    $project = $self->get_project();
    if (!$project) {
	return;
    }
    $year_prop =  $project->projectprops->find(
        { 'type.name' => 'project year' },
        { join => 'type'}
        ); #there should be only one project year prop.
    if (!$year_prop) {
	return;
    }
    $year = $year_prop->value;
    return $year;
}

sub _get_plots {
    my $self = shift;
    my $project;
    my $field_layout_experiment;
    my @plots;
    $project = $self->get_project();
    if (!$project) {
	return;
    }

    $field_layout_experiment = $self->_get_field_layout_experiment_from_project();
    if (!$field_layout_experiment) {
	print STDERR "No field layout experiment found!\n";
	return;
    }

    # get source stock types
    my $source_cvterm_ids = $self->get_source_stock_type_ids();
    print STDERR "EXP TYPE =".$self->get_experiment_type()."\n";

     # if ($self->get_experiment_type eq 'field_layout'){
     # 	$unit_type_id = $plot_cvterm_id;
     # }
     # if ($self->get_experiment_type eq 'genotyping_layout'){
     # 	$unit_type_id = $tissue_cvterm_id;
     # }
     # if ($self->get_experiment_type eq 'analysis_experiment') {
     # 	print STDERR "EXP TYPE = analysis_experiment ($analysis_instance_cvterm_id)... \n";
     # 	$unit_type_id = $analysis_instance_cvterm_id;
     # }
    @plots = $field_layout_experiment->nd_experiment_stocks->search_related('stock', {'stock.type_id' => {-in => $self->get_target_stock_type_ids()  } });

    #debug...
    # print STDERR "PLOT LIST: \n";
    # print STDERR  join( "\n", map { $_->name() } @plots)."\n";

    return \@plots;
}

sub _build_cvterm_hash {
    my $self = shift;

    print STDERR "Building cvterm has...\n";
    my %hash;

    my $stockprop_rs = $self->get_schema->resultset("Cv::Cvterm")->search( { 'cv.name' => { -in => [ 'stock_property', 'stock_type', 'experiment_property', 'experiment_type', 'stock_relationship', 'project_property', 'project_relationship' ] } }, { join => 'cv' });

    while (my $sp = $stockprop_rs->next()) {
	#print STDERR "Adding ".$sp->name()."...\n";
	if (exists($hash{ $sp->name() })) {
	    die "Duplicate term detected (".$sp->name()."). Sorry, but you cannot continue.";
	}
	$hash{ $sp->name() } = $sp->cvterm_id();
    }

    $self->set_cvterm_hash(\%hash);
}



    # $hash{accession} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "accession", "stock_type")->cvterm_id();
    # $hash{cross} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "cross", "stock_type")->cvterm_id();
    # $hash{family_name} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "family_name", "stock_type")->cvterm_id();
    # $hash{plot} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "plot", "stock_type")->cvterm_id();
    # $hash{plant} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "plant", "stock_type")->cvterm_id();
    # $hash{subplot} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "subplot", "stock_type")->cvterm_id();
    # $hash{seedlot} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "seedlot", "stock_type")->cvterm_id();
    # $hash{tissue_sample} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "tissue_sample", "stock_type")->cvterm_id();
    # $hash{plot_of} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "plot_of", "stock_relationship")->cvterm_id();
    # $hash{analysis_of} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "analysis_of", "stock_relationship");
    # $hash{tissue_sample_of} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema(), "tissue_sample_of", "stock_relationship")->cvterm_id();
    # $hash{$plant_of} = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'plant_of', 'stock_relationship' );
    # my $subplot_rel_cvterm = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'subplot_of', 'stock_relationship' );
    # my $subplot_rel_cvterm_id = $subplot_rel_cvterm->cvterm_id();
    # my $plant_rel_cvterm_id = $plant_rel_cvterm->cvterm_id();
    # my $analysis_of_cvterm_id = $analysis_of_cv->cvterm_id();


    # my $plant_of_subplot_rel_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'plant_of_subplot', 'stock_relationship' )->cvterm_id();
    # my $seed_transaction_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'seed transaction', 'stock_relationship' )->cvterm_id();
    # my $collection_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'collection_of', 'stock_relationship' )->cvterm_id();
    # my $plot_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'plot number', 'stock_property' )->cvterm_id();
    # my $plant_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'plant_index_number', 'stock_property' )->cvterm_id();
    # my $tissue_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'tissue_sample_index_number', 'stock_property' )->cvterm_id();
    # my $subplot_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'subplot_index_number', 'stock_property' )->cvterm_id();
    # my $block_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'block', 'stock_property' )->cvterm_id();
    # my $replicate_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'replicate', 'stock_property' )->cvterm_id();
    # my $range_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'range', 'stock_property' )->cvterm_id();
    # my $is_a_control_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'is a control', 'stock_property' )->cvterm_id();
    # my $row_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'row_number', 'stock_property' )->cvterm_id();
    # my $col_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'col_number', 'stock_property' )->cvterm_id();
    # my $is_blank_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'is_blank', 'stock_property' )->cvterm_id();
    # my $concentration_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'concentration', 'stock_property')->cvterm_id();
    # my $volume_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'volume', 'stock_property')->cvterm_id();
    # my $dna_person_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'dna_person', 'stock_property')->cvterm_id();
    # my $extraction_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'extraction', 'stock_property')->cvterm_id();
    # my $tissue_type_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'tissue_type', 'stock_property')->cvterm_id();
    # my $acquisition_date_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'acquisition date', 'stock_property')->cvterm_id();
    # my $notes_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'notes', 'stock_property')->cvterm_id();
    # my $ncbi_taxonomy_id_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'ncbi_taxonomy_id', 'stock_property')->cvterm_id();
    # my $plot_geo_json_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->get_schema, 'plot_geo_json', 'stock_property' )->cvterm_id();
#    print STDERR "Done.\n";
#}


# sub _get_genotyping_experiment_metadata {
#     my $self = shift;

#     my $project = $self->get_project();
#     if (!$project) {
# 	return;
#     }
#     my $metadata = $project
# 	->search_related("nd_experiment_projects")
# 	->search_related("nd_experiment")
# 	->search_related("nd_experimentprop")
#    	->search({ 'type.name' => ['genotyping_user_id', 'genotyping_project_name']}, {join => 'type' });
#     return $metadata_rs;

# }

__PACKAGE__->meta->make_immutable;

#######
1;
#######
