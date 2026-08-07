#!/usr/bin/env perl

=head1 NAME

CreatePlantsAndTissueSamples.pm

=head1 SYNOPSIS

mx-run CreatePlantsAndTissueSamples [options] [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch:
 - Adds new cvterm for time ontology: year

=head1 AUTHOR

Katherine Eaton

=head1 COPYRIGHT & LICENSE

Copyright 2025 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package CreatePlantsAndTissueSamples;

use Moose;
use Bio::Chado::Schema;
use SGN::Model::Cvterm;
use CXGN::Phenotypes::StorePhenotypes;
use DateTime;
use CXGN::Trial;
use File::Temp qw/tempfile/;
use CXGN::People::Schema;
use CXGN::Metadata::Schema;
use CXGN::Phenome::Schema;
use Data::Dumper;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => <<'' );
Creates plants and tissue samples for select plots in Kasese solgs trial.

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " .   $self->name . ".\n\nDescription:\n  ".  $self->description . ".\n\nExecuted by:\n " .  $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    # Prepare schemas
    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );
    my $dbh = $schema->storage()->dbh();
    my $people_schema = CXGN::People::Schema->connect( sub { $dbh }, { on_connect_do => ['SET search_path TO public,sgn_people;'] } );
    my $metadata_schema = CXGN::Metadata::Schema->connect( sub { $dbh }, { on_connect_do => ['SET search_path TO public,metadata;'] } );
    my $phenome_schema = CXGN::Phenome::Schema->connect( sub { $dbh }, { on_connect_do => ['SET search_path TO public,phenome;'] } );

    # Prepare phenotypes
    my $trait_name ='fresh root weight|CO_334:0000012';
    my $phenotype_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "fresh root weight", 'cassava_trait')->cvterm_id();

    # Prepare stock types
    my $accession_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "accession", 'stock_type')->cvterm_id();
    my $plant_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "plant", 'stock_type')->cvterm_id();
    my $tissue_sample_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "tissue_sample", 'stock_type')->cvterm_id();
    my $cross_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "cross", 'stock_type')->cvterm_id();
    my $family_name_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "family_name", 'stock_type')->cvterm_id();

    my $block_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'block', 'stock_property')->cvterm_id();
    my $plot_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot number', 'stock_property')->cvterm_id();
    my $replicate_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'replicate', 'stock_property')->cvterm_id();
    my $row_num_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'row_number', 'stock_property')->cvterm_id();
    my $col_num_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'col_number', 'stock_property')->cvterm_id();
    my $has_plants_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'project_has_plant_entries', 'project_property')->cvterm_id();
    my $field_layout_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'field_layout', 'experiment_type')->cvterm_id();

    my $plot_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "plot_of", 'stock_relationship')->cvterm_id();
    my $plant_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "plant_of", 'stock_relationship')->cvterm_id();
    my $tissue_sample_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "tissue_sample_of", 'stock_relationship')->cvterm_id();

    my $plant_index_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "plant_index_number", 'stock_property')->cvterm_id();
    my $tissue_type_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "tissue_type", 'stock_property')->cvterm_id();
    my $tissue_sample_index_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, "tissue_sample_index_number", 'stock_property')->cvterm_id();

    my $user_id = $people_schema->resultset("SpPerson")->find( { username => $self->username } )->sp_person_id;
    my $trial_id = $schema->resultset('Project::Project')->find({name => 'Kasese solgs trial'})->project_id;

    my @plot_names = ('KASESE_TP2013_1043', 'KASESE_TP2013_1044', 'KASESE_TP2013_1045');

    my $organism_id = 103155;
    my $tissue_type = 'leaf';
    my $num_tissue_samples = 3;

    foreach my $plot_name (@plot_names) {

        # ---------------------------------------------------------------------
        # Create Plants with phenotypes

        my $plant_name = $plot_name . '_plant1';
        my $plot_id = $schema->resultset("Stock::Stock")->find({uniquename => $plot_name})->stock_id();
        my $accession_id = $schema->resultset("Stock::StockRelationship")->find(
            {
                'me.subject_id'=>$plot_id,
                'me.type_id'=>$plot_of_cvterm_id,
                'object.type_id'=>$accession_cvterm_id
            },
            {
                'join'=>'object'
            }
        )->object_id();

        print STDERR "creating plant: $plant_name, plot: $plot_id, accession: $accession_id\n";

        my $trial = CXGN::Trial->new({
            bcs_schema => $schema,
            phenome_schema => $phenome_schema,
            metadata_schema => $metadata_schema,
            trial_id => $trial_id,
        });

        my $plant_index_number = 1;
        my $row_num = undef;
        my $col_num = undef;

        my $field_layout_experiment = $schema->resultset("Project::Project")->search(
            { 'me.project_id' => $trial->get_trial_id() },
            { select=>['nd_experiment.nd_experiment_id']}
        )->search_related('nd_experiment_projects')->search_related(
            'nd_experiment',
            { 'nd_experiment.type_id' => $field_layout_cvterm_id }
        )->single();

        $trial->_save_plant_entry(
            $schema, $accession_cvterm_id, $cross_cvterm_id, $family_name_cvterm_id,
            $organism_id, $plot_name, $plot_id, $plant_name, $plant_cvterm_id,
            $plant_index_number, $plant_index_number_cvterm_id, $block_cvterm_id,
            $plot_number_cvterm_id, $replicate_cvterm_id, $row_num_cvterm_id, $row_num,
            $col_num_cvterm_id, $col_num, $plant_of_cvterm_id, $field_layout_experiment,
            $field_layout_cvterm_id, $plot_of_cvterm_id, $user_id, $self->username
        );

        my $plant_id = $schema->resultset("Stock::Stock")->find({uniquename => $plant_name})->stock_id();

        my $trait_value = 10;
        store_test_phenotypes ($self, $plant_name, $trait_name, $trait_value, $phenotype_cvterm_id);

        # ---------------------------------------------------------------------
        # Create Tissue Samples with phenotypes

        foreach my $tissue_sample_num (1..$num_tissue_samples) {
            my $tissue_sample_name = $plant_name . '_' . $tissue_type . '_' . $tissue_sample_num;

            print STDERR "\tcreating tissue_sample: $tissue_sample_name\n";

            # create tissue sample stock
            my $tissue_sample_rs = $schema->resultset("Stock::Stock")->find_or_create({
                organism_id => $organism_id,
                name        => $tissue_sample_name,
                uniquename  => $tissue_sample_name,
                type_id     => $tissue_sample_cvterm_id,
            });
            my $tissue_sample_id = $tissue_sample_rs->stock_id();

            # Create tissue sample stockprops
            $schema->resultset("Stock::Stockprop")->find_or_create({
                stock_id => $tissue_sample_id,
                type_id => $tissue_type_cvterm_id,
                value => $tissue_type,
            });
            $schema->resultset("Stock::Stockprop")->find_or_create({
                stock_id => $tissue_sample_id,
                type_id => $tissue_sample_index_number_cvterm_id,
                value => $tissue_sample_num,
            });

            # Create tissue_sample relationships (tissue_sample as subject)
            my @objects = ($plant_id, $plot_id, $accession_id);
            foreach my $object_id (@objects){
                $schema->resultset("Stock::StockRelationship")->find_or_create({
                    subject_id => $tissue_sample_id,
                    object_id  => $object_id,
                    type_id    => $tissue_sample_of_cvterm_id,
                });
            }

            # Create tissue_sample nd_experiment_stock
            $schema->resultset("NaturalDiversity::NdExperimentStock")->find_or_create({
                stock_id => $tissue_sample_id,
                nd_experiment_id => $field_layout_experiment->nd_experiment_id(),
                type_id => $field_layout_cvterm_id,
            });

            store_test_phenotypes ($self, $tissue_sample_name, $trait_name, $trait_value + $tissue_sample_num, $phenotype_cvterm_id);
        }


    }

    print "You're done!\n";
}

sub store_test_phenotypes {
    my ($self, $stock_name, $trait_name, $trait_value, $phenotype_cvterm_id) = @_;
    my (undef, $tempfile) = tempfile("/tmp/delete_nd_experiment_ids_fileXXXX"); #tempfile

    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );
    my $dbh = $schema->storage()->dbh();
    my $metadata_schema = CXGN::Metadata::Schema->connect( sub { $dbh }, { on_connect_do => ['SET search_path TO public,metadata;'] } );
    my $phenome_schema = CXGN::Phenome::Schema->connect( sub { $dbh }, { on_connect_do => ['SET search_path TO public,phenome;'] } );
    my $people_schema = CXGN::People::Schema->connect( sub { $dbh }, { on_connect_do => ['SET search_path TO public,sgn_people;'] } );
    my $user_id = $people_schema->resultset("SpPerson")->find( { username => $self->username } )->sp_person_id;

    my $time = DateTime->now();
    my $timestamp = $time->ymd()."_".$time->hms();

    my %phenotype_metadata;
    $phenotype_metadata{'archived_file'} = 'none';
    $phenotype_metadata{'archived_file_type'}="direct phenotyping";
    $phenotype_metadata{'operator'} = $user_id;
    $phenotype_metadata{'date'}="$timestamp";

    # @stocks, @traits, %data
    my @stocks = ($stock_name);
    my @traits = ($trait_name);
    my $trait = SGN::Model::Cvterm::get_trait_from_cvterm_id($schema, $phenotype_cvterm_id, 'extended');


    my %data;
    $data{$stock_name}->{$trait} = [$trait_value,$timestamp]; # + operator?

    my $store_phenotypes = CXGN::Phenotypes::StorePhenotypes->new(
        basepath => '/home/production/cxgn/sgn',
        dbhost   => $self->{dbhost},
        dbname   => $self->{dbname},
        dbuser   => $self->{dbuser},
        dbpass   => $self->{dbpass},
        temp_file_nd_experiment_id => $tempfile,
        bcs_schema      => $schema,
        metadata_schema => $metadata_schema,
        phenome_schema  => $phenome_schema,
        user_id => $user_id,
        stock_list => \@stocks,
        trait_list => \@traits,
        values_hash => \%data,
        has_timestamps => 1,
        overwrite_values => 1,
        metadata_hash => \%phenotype_metadata,
        composable_validation_check_name => 0,
        allow_repeat_measures => 0,
    );

    my ($verified_warning, $verified_error) = $store_phenotypes->verify();
    # print STDERR "verified_warning: $verified_warning, verified_error: $verified_error\n";

    my ($store_error, $store_success, @store_details) = $store_phenotypes->store();
    # print STDERR "store_error: $store_error, store_success: $store_success\n";
    # print STDERR "store_details: " . Dumper(\@store_details);
}

####
1; #
####
