package CXGN::BrAPI::v2::ObservationUnits;

use Moose;
use Data::Dumper;
use SGN::Model::Cvterm;
use CXGN::Trial;
use CXGN::Trait;
use CXGN::Trial::TrialLayoutSearch;
use CXGN::BrAPI::Pagination;
use CXGN::BrAPI::JSONResponse;
use CXGN::BrAPI::v2::ExternalReferences;
use Try::Tiny;
use CXGN::List::Transform;
use Scalar::Util qw(looks_like_number);
use JSON;
use List::Compare;


extends 'CXGN::BrAPI::v2::Common';

sub search {
    my $self = shift;
    my $params = shift;
    my $c = shift;
    my $page_size = $self->page_size;
    my $page = $self->page;
    my $status = $self->status;
    my @data_files;
    my $result;
    my $total_count = 0;

    my ($data,$total_count, $page_size,$page,$status) = _search($self, $params,  $c);

    my %results = (data=>$data);
    my $pagination = CXGN::BrAPI::Pagination->pagination_response($total_count,$page_size,$page);
    return CXGN::BrAPI::JSONResponse->return_success(\%results, $pagination, \@data_files, $status, 'Observation Units search result constructed');
}


sub _search {
    my $self = shift;
	my $params = shift;
    my $c = shift;

    my $page_size = $self->page_size;
    my $page = $self->page;
    my $status = $self->status;
    my $total_count = 0;

    my $data_level = $params->{observationUnitLevelName} || ['all'];
    my $years_arrayref = $params->{seasonDbId} || ($params->{seasonDbIds} || ());
    my $location_ids_arrayref = $params->{locationDbId} || ($params->{locationDbIds} || ());
    my $accession_ids_arrayref = $params->{germplasmDbId} || ($params->{germplasmDbIds} || ());
    my $trait_list_arrayref = $params->{observationVariableName} || ($params->{observationVariableNames} || ());
    my $trait_ids_arrayref = $params->{observationVariableDbId} || ($params->{observationVariableDbIds} || ());
    my $program_ids_arrayref = $params->{programDbId} || ($params->{programDbIds} || ());
    my $folder_ids_arrayref = $params->{trialDbId} || ($params->{trialDbIds} || ());
    my $start_time = $params->{observationTimeStampRangeStart}->[0] || undef;
    my $end_time = $params->{observationTimeStampRangeEnd}->[0] || undef;
    my $observation_unit_db_id = $params->{observationUnitDbId} || ($params->{observationUnitDbIds} || ());
    my $observation_unit_names_list = $params->{observationUnitName} || ($params->{observationUnitNames} || ());
    my $include_observations = $params->{includeObservations} || "False";
    $include_observations = ref($include_observations) eq 'ARRAY' ? ${$include_observations}[0] : $include_observations;
    my $level_order_arrayref = $params->{observationUnitLevelOrder} || ($params->{observationUnitLevelOrders} || ());
    my $level_code_arrayref = $params->{observationUnitLevelCode} || ($params->{observationUnitLevelCodes} || ());
    my $levels_relation_arrayref = $params->{observationLevelRelationships} || ();
    my $levels_arrayref = $params->{observationLevels} || ();
    my $reference_ids_arrayref = $params->{externalReferenceId} || $params->{externalReferenceID} || ($params->{externalReferenceIds} || $params->{externalReferenceIDs} || ());
    my $reference_sources_arrayref = $params->{externalReferenceSource} || ($params->{externalReferenceSources} || ());

    my $study_ids_arrayref = $params->{studyDbId} || ($params->{studyDbIds} || ());

    my $phenotype_additional_info_type_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'phenotype_additional_info', 'phenotype_property')->cvterm_id();
    my $external_references_type_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'phenotype_external_references', 'phenotype_property')->cvterm_id();
    my $plot_geo_json_type_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'plot_geo_json', 'stock_property')->cvterm_id();
    my $stock_additional_info_type_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'stock_additional_info', 'stock_property')->cvterm_id();

    if ($levels_arrayref){
        $data_level = ();
        foreach ( @{$levels_arrayref} ){
            push @$level_code_arrayref, $_->{levelCode} if ($_->{levelCode});
            push @{$data_level}, $_->{levelName} if ($_->{levelName});
        }
        if (! $data_level) {
            $data_level = ['all'];
        }
    }
    my $main_production_site_url = $c->config->{main_production_site_url};

    my $lt = CXGN::List::Transform->new();

    if (!$trait_ids_arrayref && $trait_list_arrayref) {
        $trait_ids_arrayref = $lt->transform($self->bcs_schema, "traits_2_trait_ids", $trait_list_arrayref)->{transform};
    }

    my $limit = $page_size;
    my $offset = $page_size*$page;
    print STDERR "ObservationUnits call Checkpoint 1: ".DateTime->now()."\n";

    my $layout_search = CXGN::Trial::TrialLayoutSearch->new(
        {
            bcs_schema=>$self->bcs_schema,
            data_level=>$data_level->[0],
            trial_list=>$study_ids_arrayref,
            location_list=>$location_ids_arrayref,
            accession_list=>$accession_ids_arrayref,
            folder_list=>$folder_ids_arrayref,
            program_list=>$program_ids_arrayref,
            observation_unit_db_id_list=>$observation_unit_db_id,
            observation_unit_names_list=>$observation_unit_names_list,
            experiment_type=>'field_layout',
            include_observations=>  lc($include_observations) eq 'true' ? 1 : 0,
            xref_id_list=>$reference_ids_arrayref,
            xref_source_list=>$reference_sources_arrayref,
            order_by=> ($c && $c->config->{brapi_ou_order_plot_num}) ? 'NULLIF(regexp_replace(plot_number, \'\D\', \'\', \'g\'), \'\')::numeric' : undef,
            limit=>$limit,
            offset=>$offset,
        }
    );
    my ($data,$observations_data) = $layout_search->search();
    print STDERR "ObservationUnits call Checkpoint 2: ".DateTime->now()."\n";
    #print STDERR Dumper $data;
    my $start_index = $page*$page_size;
    my $end_index = $page*$page_size + $page_size - 1;

    my @data_window;

    # Get the plot parents of the plants
    my @plant_ids;
    my %plant_parents;
    foreach my $obs_unit (@$data){
        if ($obs_unit->{obsunit_type_name} eq 'plant') {
            push @plant_ids, $obs_unit->{obsunit_stock_id};
        }
    }
    if (@plant_ids && scalar @plant_ids > 0) {
        %plant_parents = $self->_get_plants_plot_parent(\@plant_ids);
    }
    print STDERR "ObservationUnits call Checkpoint 3: ".DateTime->now()."\n";
    foreach my $obs_unit (@$data){

        ## Formatting observations
        my $brapi_observations = [];

        if( lc $include_observations eq 'true' && $observations_data) {
            my $observation_id = $obs_unit->{obsunit_stock_id};
            $brapi_observations = %{$observations_data}{$observation_id} ?  %{$observations_data}{$observation_id} : [];
        }

        ## Formatting treatments
        my @brapi_treatments;
        foreach my $treatment (@{$obs_unit->{treatments}}) {
            while (my ($treatment_id, $treatment_data) = each %$treatment) {
                push @brapi_treatments, {
                    factor   => $treatment_data->{name}."|".$treatment_id." | value = ".$treatment_data->{value},
                    modality => $treatment_data->{description},
                };
            }
        }

	my %numbers;

        my $entry_type = $obs_unit->{is_a_control} ? 'check' : 'test';
	$numbers{entry_type} = $entry_type;
	
        my $replicate = $obs_unit->{rep};
	$numbers{replicate} = $replicate;
	
        my $block = $obs_unit->{block};
	$numbers{block} = $block;
	
        my $plot;

        my $plant;

        my $tissue_sample;

        my $family_stock_id;

        my $family_name;
        my $additional_info = $obs_unit->{additional_info};

        ## Following code lines add observationUnitParent to additionalInfo, useful for BI
        if ($obs_unit->{obsunit_type_name} eq 'plant') {
            $plant = $obs_unit->{plant_number};

	    $numbers{plant} = $plant;

            if ($plant_parents{$obs_unit->{obsunit_stock_id}}) {
                my $plot_object = $plant_parents{$obs_unit->{obsunit_stock_id}};
                $plot = $plot_object->{plot_number};

		$numbers{plot} = $plot;

                $additional_info->{observationUnitParent} = $plot_object->{id};
            }
        } else {
            $plot = $obs_unit->{plot_number};
	    $numbers{plot} = $plot;
        }

        ## Format position coordinates
        my $level_name = $obs_unit->{obsunit_type_name};

	    # print STDERR "LEVEL NAME: ".Dumper(\%numbers);

        my $level_order = _order($level_name) + 0;

        my $level_code = $numbers{$level_name}; ###### eval "\$$level_name" || "";

        if ( $level_order_arrayref &&  ! grep { $_ eq $level_order } @{$level_order_arrayref}  ) { next; }
        if ( $level_code_arrayref &&  ! grep { $_ eq $level_code } @{$level_code_arrayref}  ) { next; }

        my @observationLevelRelationships;
        if ($replicate) {
            push @observationLevelRelationships, {
                levelCode => $replicate,
                levelName => "rep",
                levelOrder => _order("rep"),
            };
        }
        if ($block) {
            push @observationLevelRelationships, {
                levelCode => $block,
                levelName => "block",
                levelOrder => _order("block"),
            }
        }
        if ($plot) {
            push @observationLevelRelationships, {
                levelCode => qq|$plot|,
                levelName => "plot",
                levelOrder => _order("plot"),
            }
        }
        if ($plant) {
            push @observationLevelRelationships, {
                levelCode => $plant,
                levelName => "plant",
                levelOrder => _order("plant"),
            }
        }
        if ($tissue_sample) {
            push @observationLevelRelationships, {
                levelCode => $tissue_sample,
                levelName => "tissue_sample",
                levelOrder => _order("tissue_sample"),
            }
        }

        my %observationUnitPosition = (
            entryType => $entry_type,
            geoCoordinates => $obs_unit->{plot_geo_json},
            positionCoordinateX => $obs_unit->{col_number} ? $obs_unit->{col_number} + 0 : undef,
            positionCoordinateXType => 'GRID_COL',
            positionCoordinateY => $obs_unit->{row_number} ? $obs_unit->{row_number} + 0 : undef,
            positionCoordinateYType => 'GRID_ROW',
            observationLevel =>  {
                levelName => $level_name,
                levelOrder => $level_order,
                levelCode => $level_code,
            },
            observationLevelRelationships => \@observationLevelRelationships,
        );

        my $brapi_observationUnitPosition = decode_json(encode_json \%observationUnitPosition);

        #Get external references
        my $references = CXGN::BrAPI::v2::ExternalReferences->new({
            bcs_schema => $self->bcs_schema,
            table_name => 'stock',
            table_id_key => 'stock_id',
            id => qq|$obs_unit->{obsunit_stock_id}|
        });
        my $external_references = $references->search();
        my @formatted_external_references = %{$external_references} ? values %{$external_references} : [];

        if ($obs_unit->{family_stock_id}) {
            $additional_info->{familyDbId} = qq|$obs_unit->{family_stock_id}|;
            $additional_info->{familyName} = $obs_unit->{family_uniquename};
        }

        ## Get intercropping accessions
        if ($obs_unit->{intercrop_stocks}) {
            my @intercrop;
            foreach my $i (@{$obs_unit->{intercrop_stocks}}) {
                push(@intercrop, { germplasmDbId => $i->{id}, germplasmName => $i->{name} });
            }
            $additional_info->{intercropGermplasm} = \@intercrop if scalar(@intercrop) > 0;
        }

        push @data_window, {
            externalReferences => @formatted_external_references,
            additionalInfo => $additional_info,
            germplasmDbId => $obs_unit->{germplasm_stock_id} ? qq|$obs_unit->{germplasm_stock_id}| : undef,
            germplasmName => $obs_unit->{germplasm_uniquename} ? qq|$obs_unit->{germplasm_uniquename}| : undef,
            crossDbId => $obs_unit->{cross_stock_id} ? qq|$obs_unit->{cross_stock_id}| : undef,
            crossName => $obs_unit->{cross_uniquename} ? qq|$obs_unit->{cross_uniquename}| : undef,
            locationDbId => qq|$obs_unit->{location_id}|,
            locationName => $obs_unit->{location_name},
            observationUnitDbId => qq|$obs_unit->{obsunit_stock_id}|,
            observations => $brapi_observations,
            observationUnitName => $obs_unit->{obsunit_uniquename},
            observationUnitPosition => $brapi_observationUnitPosition,
            observationUnitPUI => $main_production_site_url . "/stock/" . $obs_unit->{obsunit_stock_id} . "/view",
            programName => $obs_unit->{breeding_program_name},
            programDbId => qq|$obs_unit->{breeding_program_id}|,
            seedLotDbId => $obs_unit->{seedlot_id} ? qq|$obs_unit->{seedlot_id}| : undef,
            seedLotName => $obs_unit->{seedlot_name} ? qq|$obs_unit->{seedlot_name}| : undef,
            studyDbId => qq|$obs_unit->{trial_id}|,
            studyName => $obs_unit->{trial_name},
            plotImageDbIds => $obs_unit->{image_ids},
            treatments => \@brapi_treatments,
            trialDbId => $obs_unit->{folder_id} ? qq|$obs_unit->{folder_id}| : qq|$obs_unit->{trial_id}|,
            trialName => $obs_unit->{folder_name} ? $obs_unit->{folder_name} : $obs_unit->{trial_name},
        };
        $total_count = $obs_unit->{full_count};

    }
    print STDERR "ObservationUnits call Checkpoint 4: ".DateTime->now()."\n";
    my $results = (data=>\@data_window);

    return ($results,$total_count, $page_size,$page,$status);
}

sub _get_plants_plot_parent {
    my $self = shift;
    my $plant_id_array = shift;
    my $schema = $self->bcs_schema;

    my $plant_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plant_of', 'stock_relationship')->cvterm_id();
    my $plot_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot number', 'stock_property')->cvterm_id();
    my $plant_ids_string = join ',', @{$plant_id_array};
    my $select = "select stock.stock_id, stock_relationship.subject_id, stockprop.value from stock join stock_relationship on stock.stock_id = stock_relationship.object_id join stockprop on stock_relationship.subject_id = stockprop.stock_id where stockprop.type_id = $plot_number_cvterm_id and stock_relationship.type_id = $plant_cvterm_id and stock.stock_id in ($plant_ids_string);";
    my $h = $schema->storage->dbh()->prepare($select);
    $h->execute();

    my %plant_hash;
    while (my ($plant_id, $plot_id, $plot_number) = $h->fetchrow_array()) {
        $plant_hash{$plant_id} = { id => $plot_id, plot_number => $plot_number };
    }

    return %plant_hash;
}

sub detail {
    my $self = shift;
    my $observation_unit_db_id = shift;
    my $c = shift;

    my $search_params = {
        observationUnitDbIds => [ $observation_unit_db_id ],
        includeObservations  => 'true'
    };

    my @data_files;
    my ($data,$total_count, $page_size,$page,$status) = _search($self, $search_params,  $c);
    my $results = $data->[0];
    my $pagination = CXGN::BrAPI::Pagination->pagination_response($total_count,$page_size,$page);
    return CXGN::BrAPI::JSONResponse->return_success($results, $pagination, \@data_files, $status, 'Observation Units search result constructed');
}

sub observationunits_update {
    my $self = shift;
    my $data = shift;
    my $c = shift;

    my $page_size = $self->page_size;
    my $page = $self->page;
    my $status = $self->status;

    my $dbh = $self->bcs_schema()->storage()->dbh();
    my $schema = $self->bcs_schema;

    # -------------------------------------------------------------------------
    # Get cvterm ids from DB

    # stock type cvterms
    my $accession_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'accession', 'stock_type')->cvterm_id();
    my $plot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'plot', 'stock_type')->cvterm_id();
    my $subplot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'subplot', 'stock_type')->cvterm_id();
    my $plant_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'plant', 'stock_type')->cvterm_id();
    my $tissue_sample_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'tissue_sample', 'stock_type')->cvterm_id();

    # stock relationship cvterms
    my $plot_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot_of', 'stock_relationship')->cvterm_id();

    # stock property cvterms
    my $row_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'row_number', 'stock_property')->cvterm_id();
    my $col_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'col_number', 'stock_property')->cvterm_id();
    my $block_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'block', 'stock_property')->cvterm_id();
    my $rep_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'replicate', 'stock_property')->cvterm_id();
    my $range_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'range', 'stock_property')->cvterm_id();
    my $stake_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'stake_number', 'stock_property')->cvterm_id();
    my $set_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'set_number', 'stock_property')->cvterm_id();
    my $is_a_control_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'is a control', 'stock_property')->cvterm_id();
    my $plot_geo_json_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot_geo_json', 'stock_property')->cvterm_id();
    my $additional_info_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'stock_additional_info', 'stock_property')->cvterm_id();

    # stock index number property cvterms
    my $plot_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot number', 'stock_property')->cvterm_id();
    my $subplot_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'subplot_index_number', 'stock_property')->cvterm_id();
    my $plant_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plant_index_number', 'stock_property')->cvterm_id();
    my $tissue_sample_number_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_sample_index_number', 'stock_property')->cvterm_id();

    # other cvterms
    my $external_references_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($self->bcs_schema, 'phenotype_external_references', 'phenotype_property')->cvterm_id();

    # -------------------------------------------------------------------------
    # Initial Validation

    # Convert data array to hash, so we can more easily locate elements later
    # also validate that an observationUnitDbId has been provided
    my $observation_units = {};
    foreach my $params (@$data) {
        my $observation_unit_db_id = $params->{observationUnitDbId} || undef;
        if ( ! defined $observation_unit_db_id ){
            my $message = "observationUnitDbId is required: " . encode_json ($params) . "\n";
            print STDERR $message;
            return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf($message), 400);
        }
        $observation_units->{$observation_unit_db_id} = $params;
    }
    my @observation_unit_db_ids = (keys %$observation_units);

    # Validate provided observation units are the correct type and level
    my $stocks = $schema->resultset('Stock::Stock')->search({ stock_id => {-in => \@observation_unit_db_ids}});
    my @observation_units_found;
    while (my $record = $stocks->next){
        my $observation_unit_db_id = $record->stock_id();
        my $type_id = $record->type_id();
        my $level_name = $observation_units->{$observation_unit_db_id}->{observationUnitPosition}->{observationLevel}->{levelName};
        if (
            ( ! $type_id ~~ [$plot_cvterm_id, $subplot_cvterm_id, $plant_cvterm_id, $tissue_sample_cvterm_id] )
            || ( ! $level_name ~~ ['plot', 'subplot', 'plant', 'tissue_sample'] )
        ) {
            my $message = "observationUnitDbId $observation_unit_db_id has invalid level: type_id=$type_id, level_name=$level_name\n";
            print STDERR $message;
            return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf($message), 400);
        }
        push @observation_units_found, $observation_unit_db_id;
    }

    # Validate provided observation units exist in the database
    my $lc = List::Compare->new(\@observation_unit_db_ids, \@observation_units_found);
    my @observation_units_missing = $lc->get_Lonly();
    if (scalar @observation_units_missing > 0){
        my $message = "observationUnitDbId do not exist in the database:" . join(", ", @observation_units_missing) . "\n";
        print STDERR $message;
        return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf($message), 400);
    }

    # -------------------------------------------------------------------------
    # Get old/current values stored in the DB to check if we need to update them

    # Get old values of stockprops
    my $old_stockprops_rs = $schema->resultset('Stock::Stockprop')->search({ stock_id => {-in => \@observation_unit_db_ids}});
    my $old_stockprops = {};
    my $new_stockprops = {};
    while (my $record = $old_stockprops_rs->next){
        my $stock_id = $record->stock_id();
        my $type_id = $record->type_id();
        my $rank = $record->rank();
        my $value = $record->value();
        $old_stockprops->{$stock_id}->{$type_id} = { value => $value, rank => $rank };
    }

    # Get old values of external references
    my $old_external_references_rs = $schema->resultset('Stock::StockDbxref')->search(
        { stock_id => {-in => \@observation_unit_db_ids}},
        {
            join => { 'dbxref' => 'db' },
            '+select'=>['me.stock_id', 'db.name', 'dbxref.accession'],
            '+as'=>['observation_unit_db_id', 'db_name', 'dbxref_accession']
        }
    );
    my $old_external_references = {};
    my $new_external_references = {};
    while (my $record = $old_external_references_rs->next){
        my $observation_unit_db_id = $record->get_column('observation_unit_db_id');
        my $db_name = $record->get_column('db_name');
        my $dbxref_accession = $record->get_column('dbxref_accession');
        # Combine database name and accession to form the full reference
        # Example: DOI:10.155454/5555
        my $external_reference = {
            referenceId => $db_name . ":" . $dbxref_accession,
            referenceSource =>$db_name,
        };
        # Initialize an array to hold multiple external references per stock
        if (! defined $old_external_references->{$observation_unit_db_id}){
            $old_external_references->{$observation_unit_db_id} = [];
        }
        push @{$old_external_references->{$observation_unit_db_id}}, $external_reference;
    }

    # Get old values of parent accessions, to check if we need to update them
    # TBD simplify
    my $old_accessions_rs = $schema->resultset("Stock::Stock")->search(
        {
            'object.type_id'=> $accession_cvterm_id,
            'me.stock_id' => {-in => \@observation_unit_db_ids},
            'me.type_id' => {-in => [$plot_cvterm_id, $subplot_cvterm_id, $plant_cvterm_id, $tissue_sample_cvterm_id]}
        },
        {
            join => {'stock_relationship_subjects' => 'object'},
            '+select'=>['stock_relationship_subjects.subject_id', 'stock_relationship_subjects.object_id'],
            '+as'=>['observation_unit_db_id', 'accession_id']
        }
    );
    my $old_accessions = {};
    my $new_accessions = {};
    my $new_accession_names = {};
    while (my $record = $old_accessions_rs->next){
        my $observation_unit_db_id = $record->get_column('observation_unit_db_id');
        my $accession_id = $record->get_column('accession_id');
        $old_accessions->{$observation_unit_db_id} = $accession_id;
    }

    # -------------------------------------------------------------------------
    # Collect new stockprops from assorted BrAPI fields

    foreach my $observation_unit_db_id (@observation_unit_db_ids) {

        my $params = $observation_units->{$observation_unit_db_id};

        my $observation_unit_db_id = $params->{observationUnitDbId};
        my $accession_id = $params->{germplasmDbId};
        my $accession_name = $params->{germplasmName};
        my $trial_id = $params->{trialDbId};

        my $years_arrayref = $params->{seasonDbId}; #not implemented yet
        my $location_ids_arrayref = $params->{locationDbId}; #not implemented yet
        my $study_ids_arrayref = $params->{studyDbId}; #not implemented yet
        my $trait_list_arrayref = $params->{observationVariableDbId}; #not implemented yet
        my $program_ids_arrayref = $params->{programDbId}; #not implemented yet

        my $observationUnit_name = $params->{observationUnitName}; #not implemented yet
        my $observationUnit_position_arrayref = $params->{observationUnitPosition}; #not implemented yet
        my $seedlot_id = $params->{seedLotDbId} || ""; #not implemented yet
        my $treatments = $params->{treatments} || ""; #not implemented yet

        # if an accession_id was supplied, save it for later
        if (defined $accession_id && length $accession_id){
            # First key level is the trial_id, because that improves performance later
            $new_accessions->{$trial_id}->{$observation_unit_db_id} = $accession_id;
        } elsif (defined $accession_name && length $accession_name){
            # First key level is accession_name, because we will link this to id later
            $new_accession_names->{$accession_name} = {
                observation_unit_db_id => $observation_unit_db_id,
                trial_id => $trial_id,
            };
        }

        # parse stockprops from BrAPI key: additionalInfo
        my $range_number = $params->{additionalInfo}->{range};
        if (defined $range_number && length $range_number){
            $new_stockprops->{$observation_unit_db_id}->{$range_number_cvterm_id} = { value => $range_number};
        }
        my $stake_number = $params->{additionalInfo}->{stakeNumber};
        if (defined $stake_number && length $stake_number){
            $new_stockprops->{$observation_unit_db_id}->{$stake_number_cvterm_id} = { value => $stake_number};
        }
        my $set_number = $params->{additionalInfo}->{setNumber};
        if (defined $set_number && length $set_number){
            $new_stockprops->{$observation_unit_db_id}->{$set_number_cvterm_id} = { value => $set_number};
        }

        # BrAPI entryType overrides additionalinfo.control
        my $is_a_control = $params->{additionalInfo}->{control};
        my $entry_type = $params->{observationUnitPosition}->{entryType};

       if (defined $entry_type && length $entry_type){
            $is_a_control = uc($entry_type) eq 'CHECK' ? 1 : 0;
        }
        if (defined $is_a_control && length $is_a_control){
            $new_stockprops->{$observation_unit_db_id}->{$is_a_control_cvterm_id} = { value => $is_a_control};
        }

        # Parse other values from additional info into a hash
        my $additional_info;
        if (defined $params->{additionalInfo}) {
            foreach my $key (keys %{$params->{additionalInfo}}) {
                if (! $key ~~ ["observationUnitParent","control","range"]){
                    $additional_info->{$key} = $params->{additionalInfo}->{$key};
                }
            }
        }
        if (defined $additional_info && length $additional_info){
            $new_stockprops->{$observation_unit_db_id}->{$additional_info_cvterm_id} = { value => encode_json $additional_info};
        }

        # parse stockprops from BrAPI key: observationLevel
        my $level_name = $params->{observationUnitPosition}->{observationLevel}->{levelName};
        my $level_number = $params->{observationUnitPosition}->{observationLevel}->{levelCode};
        if (defined $level_number && length $level_number){
            my $cvterm_id;
            if    ($level_name eq 'plot')         { $cvterm_id = $plot_number_cvterm_id; }
            elsif ($level_name eq 'subplot')      { $cvterm_id = $subplot_number_cvterm_id; }
            elsif ($level_name eq 'plant')        { $cvterm_id = $plant_number_cvterm_id; }
            elsif ($level_name eq 'tissue_sample'){ $cvterm_id = $tissue_sample_number_cvterm_id; }
            if (defined $cvterm_id && length $cvterm_id){
                $new_stockprops->{$observation_unit_db_id}->{$cvterm_id} = { value => $level_number};
            }
        }

        # parse stockprops from BrAPI key: observationLevelRelationships
        my $level_relations = $params->{observationUnitPosition}->{observationLevelRelationships};
        foreach my $level (@$level_relations){
            my $cvterm_id;
            if    ($level->{levelName} eq 'block') { $cvterm_id = $block_number_cvterm_id; }
            elsif ($_->{levelName} eq 'rep')       { $cvterm_id = $rep_number_cvterm_id; }
            if (defined $cvterm_id && length $cvterm_id){
                $new_stockprops->{$observation_unit_db_id}->{$cvterm_id} = { value => $level_number};
            }
        }

        # parse stockprops from BrAPI key: observationUnitPosition
        my $row_number = $params->{observationUnitPosition}->{positionCoordinateY};
        my $col_number = $params->{observationUnitPosition}->{positionCoordinateX};
        my $plot_geo_json = $params->{observationUnitPosition}->{geoCoordinates};
        foreach my $key (keys %{$params->{observationUnitPosition}}) {
            my $cvterm_id;
            my $value = $params->{observationUnitPosition}->{$key};
            if    ($key eq 'positionCoordinateY'){ $cvterm_id = $row_number_cvterm_id; }
            elsif ($key eq 'positionCoordinateX'){ $cvterm_id = $col_number_cvterm_id; }
            elsif ($key eq 'geoCoordinates')     { $cvterm_id = $plot_geo_json_cvterm_id; $value = encode_json $value; }
            if (defined $cvterm_id && length $cvterm_id){
                $new_stockprops->{$observation_unit_db_id}->{$cvterm_id} = { value => $value};
            }
        }

        # parse external references from BrAPI key: externalReferences
        my $external_references = $params->{externalReferences};
        if (defined $external_references && length $external_references){
            $new_external_references->{$observation_unit_db_id} = $external_references;
        }
    }

    # -------------------------------------------------------------------------
    # Update stockprops in the database

    # Compare new stockprops values to old ones to check what we need to update
    my @stockprop_sql_values;
    foreach my $observation_unit_db_id (keys %$new_stockprops){
        foreach my $cvterm_id (keys %{$new_stockprops->{$observation_unit_db_id}}){
            my $old_stockprop_record = $old_stockprops->{$observation_unit_db_id}->{$cvterm_id};
            my $old_value = $old_stockprop_record->{value};
            my $rank = $old_stockprop_record->{rank} || 0;
            my $new_value = $new_stockprops->{$observation_unit_db_id}->{$cvterm_id}->{value};
            # If the value is new or changed, add it to our upsert sql query values
            if (!defined $old_value || (defined $old_value && $new_value ne $old_value)){
                push @stockprop_sql_values, "($observation_unit_db_id, $cvterm_id, $new_value, $rank)";
            }
        }
    }

    # Turn our stockprops into an upsert sql statement
    if (scalar @stockprop_sql_values > 0){
        my $stockprop_sql_string = join(', ', @stockprop_sql_values);
        my $q = "insert into stockprop(stock_id, type_id, value, rank) values $stockprop_sql_string
        on conflict (stock_id, type_id, rank) do update set value = excluded.value";
        my $sth = $dbh->prepare($q);
        $sth->execute();
    }

    # -------------------------------------------------------------------------
    # Update external references in the database

    $new_external_references->{41786} = [
        { referenceSource => 'DOI', referenceId => 'DOI:10.1021/ja101721e' }
    ];
    foreach my $observation_unit_db_id (keys %$new_external_references){

        my $old_values= @{$old_external_references->{$observation_unit_db_id}};
        my @new_values = @{$new_external_references->{$observation_unit_db_id}};
        my $update_values = 0;

        # if (@old_values !~ @new_values){
        #     my $references = CXGN::BrAPI::v2::ExternalReferences->new({
        #         bcs_schema => $schema,
        #         table_name => 'stock',
        #         table_id_key => 'stock_id',
        #         external_references => \@new_values,
        #         id => $observation_unit_db_id
        #     });
        #     my $reference_result = $references->store();
        #     if ($reference_result->{error}){
        #         my $message = $reference_result->{error} . "\n";
        #         print STDERR $message;
        #         return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf($message), 400);
        #     }
        # }
    }

    # -------------------------------------------------------------------------
    # Update accessions in the database

    # For records that only supplied a germplasmName, get the correct accession ID
    if (scalar keys %$new_accession_names > 0){
        my $accessions_rs = $schema->resultset('Stock::Stock')->search(
            {stock_id => {-in => (keys %$new_accession_names)}}
        );
        while (my $record = $accessions_rs->next){
            my $accession_id = $record->stock_id();
            my $accession_name = $record->uniquename();
            my $observation_unit_db_id = $new_accession_names->{$accession_name}->{observation_unit_db_id};
            my $trial_id = $new_accession_names->{$accession_name}->{trial_id};
            $new_accessions->{$trial_id}->{$observation_unit_db_id} = $accession_id;
        }
    }

    foreach my $trial_id (keys %$new_accessions){
        my $replace_plot_accession_fieldmap = CXGN::Trial::FieldMap->new({
            bcs_schema => $schema,
            trial_id => $trial_id,
            experiment_type => 'field_layout'
        });
        my $preflight_check_done = 0;

        foreach my $observation_unit_db_id (keys %{$new_accessions->{$trial_id}}){
            my $old_accession_id = $old_accessions->{$observation_unit_db_id};
            my $new_accession_id = $new_accessions->{$trial_id}->{$observation_unit_db_id};
            if ($old_accession_id eq $new_accession_id) { next; }

            if (!$preflight_check_done){
                my $return_error = $replace_plot_accession_fieldmap->update_fieldmap_precheck();
                if ($return_error) {
                    my $message = "Accessions cannot be replaced in trial $trial_id. $return_error\n";
                    print STDERR Dumper $message;
                    return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf($message), 400);
                }
                $preflight_check_done = 1;
            }

            my $return_error = $replace_plot_accession_fieldmap->replace_plot_accession_fieldMap(
                $observation_unit_db_id, $old_accession_id, $new_accession_id, $plot_of_cvterm_id
            );
            if ($return_error) {
                my $message = "Accession cannot be replaced in observationUnitDbId=$observation_unit_db_id. $return_error\n";
                print STDERR Dumper $message;
                return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf($message), 400);
            }
        }
    }

    my $search_params = {observationUnitDbIds => \@observation_unit_db_ids };

    return $self->search($search_params, $c);
}

sub _get_existing_germplasm {
    my $self = shift;
    my $schema = shift;
    my $accession_id = shift;
    my $accession_name = shift;

    if (!looks_like_number($accession_id)) {
        return {error => CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Verify Germplasm Id.'), 404)};
    }

    # Get the germplasm name from germplasmDbId. Check if a germplasm name passed exists
    my $rs = $schema->resultset("Stock::Stock")->search({stock_id=>$accession_id});
    if ($rs->count() eq 0 && ! defined $accession_name){
        return {error => CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Germplasm with that id does not exist.'), 404)};
    } elsif ($rs->count() > 0) {
        my $stock = $rs->first;
        $accession_name = $stock->uniquename();
    } else {
        # Check that a germplasm exists with that name
        my $rs = $schema->resultset("Stock::Stock")->search({uniquename=>$accession_name});
        if ($rs->count() eq 0) {
            return {error => CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Germplasm with that name does not exist.'), 404)};
        }
    }

    return {name => $accession_name};
}

sub observationunits_store {
    my $self = shift;
    my $data = shift;
    my $c = shift;
    my $user_id = shift;

    my $schema = $self->bcs_schema;
    my $dbh = $self->bcs_schema()->storage()->dbh();
    my $person = CXGN::People::Person->new($dbh, $user_id);
    my $user_name = $person->get_username;

    my %study_plots;
    my %seen_plot_numbers;
    foreach my $params (@{$data}) {
        my $study_id = $params->{studyDbId} || undef;
        my $plot_name = $params->{observationUnitName} ? $params->{observationUnitName} : undef;
        my $plot_number = $params->{observationUnitPosition}->{observationLevel}->{levelCode} ? $params->{observationUnitPosition}->{observationLevel}->{levelCode} : undef;
        my $plot_parent_id = $params->{additionalInfo}->{observationUnitParent} ? $params->{additionalInfo}->{observationUnitParent} : undef;
        my $accession_id = $params->{germplasmDbId} ? $params->{germplasmDbId} : undef;
        my $accession_name = $params->{germplasmName} ? $params->{germplasmName} : undef;
        my $entry_type = $params->{observationUnitPosition}->{entryType} ? $params->{observationUnitPosition}->{entryType} : undef;
        my $is_a_control = $params->{additionalInfo}->{control} ? $params->{additionalInfo}->{control} : undef;

        # BrAPI entryType overrides additionalinfo.control
        if ($entry_type) {
            $is_a_control = uc($entry_type) eq 'CHECK' ? 1 : 0;
        }

        my $range_number = $params->{additionalInfo}->{range}  ? $params->{additionalInfo}->{range}  : undef;
        my $row_number = $params->{observationUnitPosition}->{positionCoordinateY} ? $params->{observationUnitPosition}->{positionCoordinateY} : undef;
        my $col_number = $params->{observationUnitPosition}->{positionCoordinateX} ? $params->{observationUnitPosition}->{positionCoordinateX} : undef;
        my $seedlot_id = $params->{seedLotDbId} ? $params->{seedLotDbId} : undef;
        my $plot_geo_json = $params->{observationUnitPosition}->{geoCoordinates} ? $params->{observationUnitPosition}->{geoCoordinates} : undef;
        my $levels = $params->{observationUnitPosition}->{observationLevelRelationships} ? $params->{observationUnitPosition}->{observationLevelRelationships} : undef;
        my $ou_level = $params->{observationUnitPosition}->{observationLevel}->{levelName} || undef;
        my $observationUnit_x_ref = $params->{externalReferences} ? $params->{externalReferences} : undef;
        my $raw_additional_info = $params->{additionalInfo} || undef;
        my %specific_keys = map { $_ => 1 } ("observationUnitParent","control");
        my %additional_info;
        if (defined $raw_additional_info) {
            foreach my $key (keys %$raw_additional_info) {
                if (!exists($specific_keys{$key})) {
                    $additional_info{$key} = $raw_additional_info->{$key};
                }
            }
        }
        my $block_number;
        my $rep_number;

        # Required fields check
        if (! defined $accession_id && ! defined $accession_name) {
            return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Either germplasmDbId or germplasmName is required.'), 400);
        }

        if ($ou_level ne 'plant' && $ou_level ne 'plot' && $ou_level ne 'tissue_sample') {
            return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Only "plot", "plant" or "tissue_sample" allowed for observation level.'), 400);
        }

        my $project = $self->bcs_schema->resultset("Project::Project")->find({ project_id => $study_id });
        if (! defined $project) {
            return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf("A study with id $study_id does not exist"), 404);
        }

        # Get the germplasm name from germplasmDbId. Check if a germplasm name passed exists
        my $germplasm_search_result = $self->_get_existing_germplasm($schema, $accession_id, $accession_name);
        if ($germplasm_search_result->{error}) {
            return $germplasm_search_result->{error};
        } else {
            $accession_name = $germplasm_search_result->{name};
        }

        foreach (@$levels){
            if($_->{levelName} eq 'block'){
                $block_number = $_->{levelCode} ? $_->{levelCode} : undef;
            }
            if($_->{levelName} eq 'rep'){
                $rep_number = $_->{levelCode} ? $_->{levelCode} : undef;
                $_->{levelName} = 'rep';
            }
        }

        # The trial designer expects a list of plant names, this object is a plant, so add to single item list
        my $plot_hash;
        if ($ou_level eq 'plant') {
            # Check that the parent already exists
            my $plot_parent_name;
            if ($plot_parent_id) {
                my $rs = $schema->resultset("Stock::Stock")->search({stock_id=>$plot_parent_id});
                if ($rs->count() eq 0){
                    return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Plot with id %s does not exist.', $plot_parent_id), 404);
                }
                $plot_parent_name = $rs->first()->uniquename();
            } else {
                return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('addtionalInfo.observationUnitParent for observation unit with level "plant" is required'), 404);
            }

            $plot_hash = {
                plot_name       => $plot_parent_name,
                plant_names     => [ $plot_name ],
                # accession_name => $accession_name,
                stock_name      => $accession_name,
                plot_number     => $plot_number,
                block_number    => $block_number,
                is_a_control    => $is_a_control,
                rep_number      => $rep_number,
                range_number    => $range_number,
                row_number      => $row_number,
                col_number      => $col_number,
                # plot_geo_json => $plot_geo_json,
                additional_info => \%additional_info,
                external_refs   => $observationUnit_x_ref
            };
        } elsif ($ou_level eq 'tissue_sample') {
            my $plot_parent_name;
            if ($plot_parent_id) {
                my $rs = $schema->resultset("Stock::Stock")->search({stock_id=>$plot_parent_id});
                if ($rs->count() eq 0){
                    return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('Plot with id %s does not exist.', $plot_parent_id), 404);
                }
                $plot_parent_name = $rs->first()->uniquename();
            } else {
                return CXGN::BrAPI::JSONResponse->return_error($self->status, sprintf('addtionalInfo.observationUnitParent for observation unit with level "tissue_sample" is required'), 404);
            }

            $plot_hash = {
                plot_name       =>  $plot_parent_name,
                tissue_sample_names => [ $plot_name ],                
                stock_name => $accession_name,
                plot_number => $plot_number,
                block_number    => $block_number,
                is_a_control    => $is_a_control,
                rep_number      => $rep_number,
                range_number    => $range_number,
                row_number      => $row_number,
                col_number      => $col_number,
                additional_info => \%additional_info,
                external_refs   => $observationUnit_x_ref
            }
        } else {
            $plot_hash = {
                plot_name => $plot_name,
                # accession_name => $accession_name,
                stock_name => $accession_name,
                plot_number => $plot_number,
                block_number => $block_number,
                is_a_control => $is_a_control,
                rep_number => $rep_number,
                range_number => $range_number,
                row_number => $row_number,
                col_number => $col_number,
                # plot_geo_json => $plot_geo_json,
                additional_info => \%additional_info,
                external_refs   => $observationUnit_x_ref
            };
        }

        $study_plots{$study_id}{$plot_number} = $plot_hash;
        $seen_plot_numbers{$study_id}{$plot_number}++;
    }

    # Check that the plot numbers passed are unique per study
    foreach my $study_design (values %seen_plot_numbers) {
        foreach my $seen_plot_number (keys %{$study_design}) {
            if ($study_design->{$seen_plot_number} > 1) {
                return CXGN::BrAPI::JSONResponse->return_error($self->status, "Plot number '$seen_plot_number' is duplicated in the data sent. Plot Number must be unique", 422);
            }
        }
    }

    my $coderef = sub {
        foreach my $study_id (keys %study_plots) {

            # Get the study design type
            my $study = $study_plots{$study_id};
            my $project = $self->bcs_schema->resultset("Project::Project")->find({ project_id => $study_id });
            my $design_prop = $project->projectprops->find({ 'type.name' => 'design' }, { join => 'type' }); #there should be only one design prop.
            if (!$design_prop) {
                die {error => 'Study does not have a study type.', errorCode => 500};
            }
            my $design_type = $design_prop->value;

            # Get the study location
            my $location_id;
            my $location_type_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'project location', 'project_property');
            my $row = $self->bcs_schema()->resultset('Project::Projectprop')->find({
                project_id => $project->project_id(),
                type_id    => $location_type_id->cvterm_id(),
            });
            if ($row) {
                print('Row value: ' . $row->value());
                $location_id = $row->value();
            }
            else {
                die {error => sprintf('Error retrieving the location of the study'), errorCode => 500};
            }

            my $trial_design_store = CXGN::Trial::TrialDesignStore->new({
                bcs_schema                        => $schema,
                trial_id                          => $study_id,
                nd_geolocation_id                 => $location_id,
                # nd_experiment_id => $nd_experiment->nd_experiment_id(), #optional
                is_genotyping                     => 0,
                #new_treatment_has_plant_entries   => 0,
                #new_treatment_has_subplot_entries => 0,
                operator                          => $user_name,
                trial_stock_type                  => 'accessions',
                design_type                       => $design_type,
                design                            => $study,
                operator                          => $user_name
            });

            my $error;
            my $validate_design_error = $trial_design_store->validate_design();
            if ($validate_design_error) {
                die {error => sprintf('Error validating study design: ' . $validate_design_error), errorCode => 422};
            }
            else {
                $error = $trial_design_store->store();
                if ($error) {
                    die {error => sprintf('ERROR store: ' . $error), errorCode => 500};
                }
                # Refresh the trial layout property
                my %param = ( schema => $schema, trial_id => $study_id );
                if ($design_type eq 'genotyping_plate'){
                    $param{experiment_type} = 'genotyping_layout';
                } else {
                    $param{experiment_type} = 'field_layout';
                }
                my $trial_layout = CXGN::Trial::TrialLayout->new(\%param);
                my $design = $trial_layout->generate_and_cache_layout();

                foreach my $plot_num (keys %{$design}) {
                    my $observationUnit_x_ref = $study->{$plot_num}->{external_refs};
                    if ($observationUnit_x_ref){
                        my $references = CXGN::BrAPI::v2::ExternalReferences->new({
                            bcs_schema => $self->bcs_schema,
                            table_name => 'stock',
                            table_id_key => 'stock_id',
                            external_references => $observationUnit_x_ref,
                            id => $design->{$plot_num}->{plot_id}
                        });
                        my $reference_result = $references->store();
                    }
                }
            }
        }
    };

    my $error_resp;
    try {
        $schema->txn_do($coderef);
    }
    catch {
        print "Error: :". Dumper($_);
        # print Dumper("Error: $_\n");
        $error_resp = CXGN::BrAPI::JSONResponse->return_error($self->status, $_->{error}, $_->{errorCode} || 500);
    };
    if ($error_resp) { return $error_resp; }

    # Get our new OUs by name. Not ideal, but names are unique and its the quickest solution
    my @observationUnitNames;
    foreach my $ou (@{$data}) { push @observationUnitNames, $ou->{observationUnitName}; }
    my $search_params = {observationUnitNames => \@observationUnitNames};
    $self->page_size(scalar @{$data});
    return $self->search($search_params, $c);
}

sub _order {
    my $value = shift;
    my %levels = (
        "rep"  => 0,
        "block"  => 1,
        "plot" => 2,
        "subplot"=> 3,
        "plant"=> 4,
        "tissue_sample"=> 5,

    );
    return $levels{$value} + 0;
}

1;
