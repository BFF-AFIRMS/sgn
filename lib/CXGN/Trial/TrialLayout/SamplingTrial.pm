
package CXGN::Trial::TrialLayout::SamplingTrial;

use Moose;
use namespace::autoclean;
use Data::Dumper;

extends 'CXGN::Trial::TrialLayout::AbstractLayout';


sub BUILD {
    my $self = shift;

    print STDERR "BUILD CXGN::Trial::TrialLayout::SamplingTrial...\n";

    $self->set_source_primary_stock_types( [ "accession" ] );
    $self->set_source_stock_types( [ "accession" ] );
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

	my $schema = $self->get_schema();
    my $design = $self->SUPER::retrieve_plot_info($plots);

	# Get lookup of plot_ids to plot_numbers, we'll need this
	# to update our design with source material
    my $plot_ids_to_plot_numbers;
    foreach my $plot_number (keys %$design){
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
 }

###

__PACKAGE__->meta()->make_immutable();

1;
