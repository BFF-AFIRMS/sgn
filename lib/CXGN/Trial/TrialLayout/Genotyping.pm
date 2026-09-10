
package CXGN::Trial::TrialLayout::Genotyping;

use Moose;
use namespace::autoclean;
use Data::Dumper;

extends 'CXGN::Trial::TrialLayout::AbstractLayout';


sub BUILD {
    my $self = shift;

    print STDERR "BUILD CXGN::Trial::TrialLayout::Genotyping...\n";

    $self->set_source_primary_stock_types( [ "accession" ] );
    $self->set_source_stock_types( [ "accession", "plot", "subplot", "plant", "tissue_sample"] );
    $self->set_relationship_types( [ "tissue_sample_of" ] );
    $self->set_target_stock_types( [ "tissue_sample" ] );
    $self->convert_source_stock_types_to_ids();

        # probably better to lazy load the action design...
    #

    $self->_lookup_trial_id();

}



sub retrieve_plot_info {
    my $self = shift;
    my $plots = shift;

    my $accession_cvterm_id = $self->cvterm_id('accession');
    my $plot_cvterm_id = $self->cvterm_id('plot');
    my $subplot_cvterm_id = $self->cvterm_id('subplot');
    my $plant_cvterm_id = $self->cvterm_id('plant');
    my $tissue_sample_cvterm_id = $self->cvterm_id('tissue_sample');

    my $schema = $self->get_schema();
    my $design = $self->SUPER::retrieve_plot_info($plots);

    # -------------------------------------------------------------------------
    # Set genotyping project properties

    my $project = $self->get_project();
    my $genotyping_user_id = "unknown";
    my $genotyping_project_name = "";
    my $genotyping_project_id = "";
    my $genotyping_project ="";

    my $genotyping_user_id_row = $project
        ->search_related("nd_experiment_projects")
        ->search_related("nd_experiment")
        ->search_related("nd_experimentprops")
        ->find({ 'type.name' => 'genotyping_user_id' }, {join => 'type' });

    if ($genotyping_user_id_row) {
        $genotyping_user_id = $genotyping_user_id_row->get_column("value") || "unknown";
    }

    my $genotyping_project_relationship_cvterm_id = $self->cvterm_id('genotyping_project_and_plate_relationship');
    my $genotyping_project_plate_relationship = $self->get_schema()
        ->resultset("Project::ProjectRelationship")
        ->find ({
            subject_project_id => $project->project_id(),
            type_id => $genotyping_project_relationship_cvterm_id
        });

    if ($genotyping_project_plate_relationship) {
        $genotyping_project_id = $genotyping_project_plate_relationship->object_project_id();
        $genotyping_project = $self->get_schema()
            ->resultset("Project::Project")
            ->find ({ project_id => $genotyping_project_id });
        $genotyping_project_name = $genotyping_project->name();
        # print STDERR "GENOTYPING PROJECT NAME =".Dumper($genotyping_project_name)."\n";
    }

    # print STDERR "GENOTYPING PROJECT NAME =".Dumper($genotyping_project_name)."\n";

    my $plot_ids_to_plot_numbers;
    foreach my $plot_number (keys %$design){
        $design->{$plot_number}->{genotyping_user_id} = $genotyping_user_id;
        # print STDERR "RETRIEVED: genotyping_user_id: $design->{genotyping_user_id}\n";
        $design->{$plot_number}->{genotyping_project_name} = $genotyping_project_name;
        # print STDERR "RETRIEVED: genotyping_project_name: $design->{genotyping_project_name}\n";
        my $plot_id =  $design->{$plot_number}->{plot_id};
        $plot_ids_to_plot_numbers->{$plot_id} = $plot_number;
    }
    my @plot_ids = keys %$plot_ids_to_plot_numbers;

    # -------------------------------------------------------------------------
    # Set source of material in genotyping plate well

    my $source_rs = $schema->resultset("Stock::StockRelationship")
        ->search(
	        {
                'me.subject_id' => {-in => \@plot_ids},
                'me.type_id' => { -in => $self->get_relationship_type_ids() },
                'object.type_id' => { -in => $self->get_source_stock_type_ids() }
            },
            {
                'join' => {'object' => ['organism', 'type']},
                '+select' => ['me.subject_id', 'object.stock_id', 'object.uniquename', 'type.name',  'organism.genus', 'organism.species' ],
                '+as' => ['plot_id', 'source_id', 'source_name', 'type_name', 'genus', 'species'],
            }
	    );

    while (my $record = $source_rs->next()){
        my $type_name = $record->get_column('type_name');
        my $plot_id = $record->get_column('plot_id');
        my $source_id = $record->get_column('source_id');
        my $source_name = $record->get_column('source_name');
        my $genus = $record->get_column('genus');
        my $species = $record->get_column('species');
        my $plot_number = $plot_ids_to_plot_numbers->{$plot_id};

        # print STDERR "Dealing with $type_name metadata.\n";

        $design->{$plot_number}->{"source_" . "$type_name"} = $source_id;
        $design->{$plot_number}->{"source_" . "$type_name" . "_name"} = $source_name;
        $design->{$plot_number}->{"source_observation_unit_name"} = $source_name;
        $design->{$plot_number}->{"source_observation_unit_id"} = $source_id;
        $design->{$plot_number}->{"species"} = $species;
        $design->{$plot_number}->{"genus"} = $genus;
    }

    return $design;
 }

###

__PACKAGE__->meta()->make_immutable();

1;
