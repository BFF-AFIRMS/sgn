#!/usr/bin/env perl

=head1 NAME

FixGenotypingViews.pm

=head1 SYNOPSIS

mx-run FixGenotypingViews [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch fixes genotyping views including genotyping_protocols and genotyping_projects.

=head1 AUTHOR

Katherine Eaton <kmeaton1@ualberta.ca>

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package FixGenotypingViews;

use SGN::Model::Cvterm;
use Bio::Chado::Schema;
use Moose;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => 'Fixes genotyping views including genotyping_protocols and genotyping_projects.' );

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " . $self->name . ".\n\nDescription:\n  " . $self->description . ".\n\nExecuted by:\n " . $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    print STDOUT "\nFetching Cvterms.\n";
    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );

    my $accession_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'accession', 'stock_type')->cvterm_id();
    my $breeding_program_trial_relationship_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'breeding_program_trial_relationship', 'project_relationship')->cvterm_id();
    my $genotyping_experiment_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'genotyping_experiment', 'experiment_type')->cvterm_id();
    my $plant_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plant', 'stock_type')->cvterm_id();
    my $plot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot', 'stock_type')->cvterm_id();
    my $project_year_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'project year', 'project_property')->cvterm_id();
    my $subplot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'subplot', 'stock_type')->cvterm_id();
    my $project_location_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'project location', 'project_property')->cvterm_id();
    my $seed_transaction_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'seed transaction', 'stock_relationship')->cvterm_id();
    my $tissue_sample_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_sample', 'stock_type')->cvterm_id();
    my $tissue_sample_of_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_sample_of', 'stock_relationship')->cvterm_id();
    my $trial_design_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'design', 'project_property')->cvterm_id();

    my $project_type_cv_id = $schema->resultset("Cv::Cv")->find({ name => 'project_type'})->cv_id();

    # Views that will be updated:
    #  - accessionsxgenotyping_projects
    #  - accessionsxgenotyping_protocols
    #  - breeding_programsxgenotyping_projects
    #  - breeding_programsxgenotyping_protocols
    #  - genotyping_projects
    #  - genotyping_projectsxgenotyping_protocols
    #  - genotyping_projectsxlocations
    #  - genotyping_projectsxorganisms
    #  - genotyping_projectsxplants
    #  - genotyping_projectsxplots
    #  - genotyping_projectsxseedlots
    #  - genotyping_projectsxsubplots
    #  - genotyping_projectsxtissue_sample
    #  - genotyping_projectsxtrait_components
    #  - genotyping_projectsxtraits
    #  - genotyping_projectsxtrial_designs
    #  - genotyping_projectsxtrial_types
    #  - genotyping_projectsxtrials
    #  - genotyping_projectsxyears
    #  - genotyping_protocols
    #  - genotyping_protocolsxlocations
    #  - genotyping_protocolsxorganisms
    #  - genotyping_protocolsxplants
    #  - genotyping_protocolsxplots
    #  - genotyping_protocolsxseedlots
    #  - genotyping_protocolsxsubplots
    #  - genotyping_protocolsxtissue_sample
    #  - genotyping_protocolsxtrait_components
    #  - genotyping_protocolsxtraits
    #  - genotyping_protocolsxtrial_designs
    #  - genotyping_protocolsxtrial_types
    #  - genotyping_protocolsxtrials
    #  - genotyping_protocolsxyears

    print STDOUT "\nExecuting the SQL commands.\n";

    $self->dbh->do(<<EOSQL);
-------------------------------------------------------------------------------
-- View: accessionsxgenotyping_projects
-- Objective: Link genotyping projects to the accessions that have been
--            genotyped. There are two stock types that can be genotyped:
--            accessions and tissue samples. In the case of tissue samples,
--            we report the parent accession in this view.
-- Reason For Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples and accessions.
--   2. Get parent accessions of tissue samples.

drop view public.accessionsxgenotyping_projects;
create view public.accessionsxgenotyping_projects as (
    select
        distinct
            coalesce(accession_of_tissue_sample.stock_id, accession.stock_id) as accession_id,
            project_id as genotyping_project_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    left join stock_relationship on (stock_id = stock_relationship.subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    left join stock as tissue_sample on ( subject_id = tissue_sample.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id )
    left join stock as accession_of_tissue_sample on ( object_id = accession_of_tissue_sample.stock_id and accession_of_tissue_sample.type_id = $accession_cvterm_id )
    left join stock as accession on ( nd_experiment_stock.stock_id = accession.stock_id and accession.type_id = $accession_cvterm_id )
    where coalesce(accession_of_tissue_sample.uniquename, accession.uniquename) is not null
);
alter view public.accessionsxgenotyping_projects owner to web_usr;


-------------------------------------------------------------------------------
-- View: accessionsxgenotyping_protocols
-- Objective: Link genotyping protocols to the accessions that have been
--            genotyped. There are two stock types that can be genotyped:
--            accessions and tissue samples. In the case of tissue samples,
--            we report the parent accession in this view.
-- Reason For Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples and accessions.
--   2. Get parent accessions of tissue samples.

drop view public.accessionsxgenotyping_protocols;
create view public.accessionsxgenotyping_protocols as (
    select
        distinct
            coalesce(accession_of_tissue_sample.stock_id, accession.stock_id) as accession_id,
            nd_protocol_id as genotyping_protocol_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    left join stock_relationship on (stock_id = stock_relationship.subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    left join stock as tissue_sample on ( subject_id = tissue_sample.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id )
    left join stock as accession_of_tissue_sample on ( object_id = accession_of_tissue_sample.stock_id and accession_of_tissue_sample.type_id = $accession_cvterm_id )
    left join stock as accession on ( nd_experiment_stock.stock_id = accession.stock_id and accession.type_id = $accession_cvterm_id )
    where coalesce(accession_of_tissue_sample.uniquename, accession.uniquename) is not null
);
alter view public.accessionsxgenotyping_protocols owner to web_usr;


-------------------------------------------------------------------------------
-- View: breeding_programsxgenotyping_projects
-- Objective: Link genotyping projects to the breeding program
--            they were performed in.
-- Reason For Change: Avoid use of subqueries.
-- Steps:
--   1. Get genotyping projects.
--   2. Get breeding program the project is associated with.

drop view public.breeding_programsxgenotyping_projects;
create view public.breeding_programsxgenotyping_projects as (
    select distinct object_project_id as breeding_program_id, project_id as genotyping_project_id
    from project_relationship
    join cvterm on (type_id = cvterm_id and cvterm_id = $breeding_program_trial_relationship_cvterm_id)
    join projectprop on (subject_project_id = projectprop.project_id and projectprop.value = 'genotype_data_project' and projectprop.type_id = $trial_design_cvterm_id)
    join nd_experiment_project using (project_id)
);
alter view public.breeding_programsxgenotyping_projects owner to web_usr;


-------------------------------------------------------------------------------
-- View: breeding_programsxgenotyping_protocols
-- Objective: Link genotyping protocols to the breeding program
--            they were performed in.
-- Reason For Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyping projects.
--   2. Get breeding program the project is associated with.

drop view public.breeding_programsxgenotyping_protocols;
create view public.breeding_programsxgenotyping_protocols as (
    select distinct object_project_id as breeding_program_id, nd_protocol_id as genotyping_protocol_id
    from project_relationship
    join cvterm on (type_id = cvterm_id and cvterm_id = $breeding_program_trial_relationship_cvterm_id)
    join projectprop on (subject_project_id = projectprop.project_id and projectprop.value = 'genotype_data_project' and projectprop.type_id = $trial_design_cvterm_id)
    join nd_experiment_project using (project_id)
    join nd_experiment_protocol using (nd_experiment_id)
);
alter view public.breeding_programsxgenotyping_protocols owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxgenotyping_protocols
-- Objective: Link genotyping protocols to the genotyping
--            projects they have been used in.
-- Reason For Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyping protocols.
--   2. Get parent genotyping projects.

drop view public.genotyping_projectsxgenotyping_protocols;
create view public.genotyping_projectsxgenotyping_protocols as (
    select distinct project.project_id as genotyping_project_id, nd_protocol_id as genotyping_protocol_id
    from nd_experiment_protocol
    join nd_experiment_project using (nd_experiment_id)
    join project using (project_id)
    join projectprop on ( projectprop.project_id = project.project_id and projectprop.type_id = $trial_design_cvterm_id and value = 'genotype_data_project' )
);
alter view public.genotyping_projectsxgenotyping_protocols owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxlocations
-- Objective: Link genotyping protocols to the locations
--            of the genotyping material, according to
--            where the trial of the parent plot is.
-- Reason For Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plots of tissue samples.
--   3. Get trial plot is in.
--   4. Get location where trial is.


drop view public.genotyping_projectsxlocations;
create view public.genotyping_projectsxlocations as (
    select distinct nd_experiment_project.project_id as genotyping_project_id, (projectprop.value)::integer as location_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project as plot_trial on (nd_experiment_plot.nd_experiment_id = plot_trial.nd_experiment_id)
    join projectprop on ( plot_trial.project_id = projectprop.project_id and projectprop.type_id = $project_location_cvterm_id )
);
alter view public.genotyping_projectsxlocations owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxorganisms
-- Objective: Link genotyping projects to organisms of genotyped material.
-- Reason For Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples and accessions.
--   2. Get organisms of genotyped stocks.

drop view public.genotyping_projectsxorganisms;
create view public.genotyping_projectsxorganisms as (
    select distinct project_id as genotyping_project_id, coalesce(tissue_sample.organism_id, accession.organism_id) as organism_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    left join stock_relationship on ( stock_id = stock_relationship.subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    left join stock as tissue_sample on ( object_id = tissue_sample.stock_id and tissue_sample.type_id = $accession_cvterm_id )
    left join stock as accession on ( nd_experiment_stock.stock_id = accession.stock_id and accession.type_id = $accession_cvterm_id )
    where coalesce(tissue_sample.organism_id, accession.organism_id) is not null
);
alter view public.genotyping_projectsxorganisms owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxplants
-- Objective: Link genotyping projects to plants who have genotyped tissue samples.
-- Reason For Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plants of tissue samples.

drop view public.genotyping_projectsxplants;
create view public.genotyping_projectsxplants as (
    select distinct project_id as genotyping_project_id, plant.stock_id as plant_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on (stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id)
    join stock as plant on (object_id = plant.stock_id and plant.type_id = $plant_cvterm_id)
);
alter view public.genotyping_projectsxplants owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxplots
-- Objective: Link genotyping projects to plots that contain genotyped tissue samples.
-- Reason for Change: Pre-existing view gave wrong results, plots that were not genotyped.
--                    Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plots of tissue samples.
--   3. Get genotyping project tissue sample was used in.

drop view public.genotyping_projectsxplots;
create view public.genotyping_projectsxplots as (
    select distinct project_id as genotyping_project_id, plot.stock_id as plot_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    join stock as plot on ( object_id = plot.stock_id and plot.type_id = $plot_cvterm_id )
);
alter view public.genotyping_projectsxplots owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxseedlots
-- Objective: Link genotyping protocols to tissue samples that are in plots with known seeds.
-- Reason for Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plots.
--   3. Get seedlots planted in plots.

drop view public.genotyping_projectsxseedlots;
create view public.genotyping_projectsxseedlots as (
    select distinct project_id as genotyping_project_id, seedlot_of_plot.object_id as seedlot_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join stock_relationship as seedlot_of_plot on (plot.stock_id = seedlot_of_plot.subject_id and seedlot_of_plot.type_id = $seed_transaction_cvterm_id)
);
alter view public.genotyping_projectsxseedlots owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxsubplots
-- Objective: Link genotyping projects to subplots that contain genotyped tissue samples.
-- Reason for Change: Pre-existing view gave wrong results, subplots that were not genotyped.
--                    Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent subplots of tissue samples.
--   3. Get genotyping project tissue sample was used in.

drop view public.genotyping_projectsxsubplots;
create view public.genotyping_projectsxsubplots as (
    select distinct project_id as genotyping_project_id, subplot.stock_id as plot_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    join stock as subplot on ( object_id = subplot.stock_id and subplot.type_id = $subplot_cvterm_id )
);
alter view public.genotyping_projectsxsubplots owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxtissue_sample
-- Objective: Link genotyping projects to plots that contain genotyped tissue samples.
-- Reason for Change: Pre-existing view did not exist.
-- Reminder: Table name is non-pluralized (tissue_sample) for legacy support
-- Steps:
--   1. Get genotyped tissue samples.
--   3. Get genotyping project tissue sample was used in.

create view public.genotyping_projectsxtissue_sample as (
    select distinct project_id as genotyping_project_id, stock_relationship.subject_id as tissue_sample_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
);
alter view public.genotyping_projectsxtissue_sample owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxtraits
-- Objective: Link genotyping projects to tissue samples that have been phenotyped.
--            The tissue sample may be genotyped or any of its parents (plant, plot, etc.)
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Also get parents of genotyped tissue samples.
--   3. Get phenotypes of both tissue samples or parents.
-- Note: I would prefer this view did not utilize a subquery.

drop view public.genotyping_projectsxtraits;
create view public.genotyping_projectsxtraits as (
    with genotyped_stocks as (
        -- directly genotyped tissue samples
        select project_id as genotyping_project_id, tissue_sample.stock_id
        from nd_experiment_genotype
        join nd_experiment_project using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        union
        -- parents of genotyped tissue samples (plants, plots, accessions, etc.)
        select project_id as genotyping_project_id, object_id as stock_id
        from nd_experiment_genotype
        join nd_experiment_project using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        join stock_relationship on (tissue_sample.stock_id = subject_id)
    )
    select distinct genotyping_project_id, observable_id as trait_id
    from genotyped_stocks
    join nd_experiment_stock using (stock_id)
    join nd_experiment_phenotype using (nd_experiment_id)
    join phenotype using (phenotype_id)
);
alter view public.genotyping_projectsxtraits owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxtrait_components
-- Objective: Link genotyping projects to stocks phenotyped using composed traits.
--            The tissue sample may be genotyped or any of its parents (plant, plot, etc.)
-- Reason for Change: Pre-existing view incorrectly returned no results.
--                    Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Also get parents of genotyped tissue samples.
--   3. Get phenotypes of both tissue samples or parents.
--   4. Get trait components of phenotypes.
-- Note: I would prefer this view did not utilize a subquery.

drop view public.genotyping_projectsxtrait_components;
create view public.genotyping_projectsxtrait_components as (
    with genotyped_stocks as (
        -- directly genotyped tissue samples
        select project_id as genotyping_project_id, tissue_sample.stock_id
        from nd_experiment_genotype
        join nd_experiment_project using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        union
        -- parents of genotyped tissue samples (plants, plots, accessions, etc.)
        select project_id as genotyping_project_id, object_id as stock_id
        from nd_experiment_genotype
        join nd_experiment_project using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        join stock_relationship on (tissue_sample.stock_id = subject_id)
    )
    select distinct genotyping_project_id, subject_id as trait_component_id
    from genotyped_stocks
    join nd_experiment_stock using (stock_id)
    join nd_experiment_phenotype using (nd_experiment_id)
    join phenotype using (phenotype_id)
    join cvterm_relationship on (object_id = observable_id)
);
alter view public.genotyping_projectsxtrait_components owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_projectsxtrial_designs
-- Objective: Link genotyping protocols to tissue samples that are found in trials
--            according to trial design.
-- Reason for Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get plots of those tissue samples.
--   3. Get trials the plots are in.
--   4. Get design of the trial.

drop view public.genotyping_projectsxtrial_designs;
create view public.genotyping_projectsxtrial_designs as (
    select distinct nd_experiment_project.project_id as genotyping_project_id, projectprop.value as trial_design_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( nd_experiment_stock.stock_id = stock_relationship.subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id)
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project as plot_trial on (nd_experiment_plot.nd_experiment_id = plot_trial.nd_experiment_id)
    join projectprop on ( plot_trial.project_id = projectprop.project_id and projectprop.type_id = $trial_design_cvterm_id )
);
alter view public.genotyping_projectsxtrial_designs owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_projectsxtrial_types
-- Objective: Link genotyping projects to tissue samples that are found in trials
--            according to trial type.
-- Reason for Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get plots of those tissue samples.
--   3. Get trials the plots are in.
--   4. Get type of the trial.

drop view public.genotyping_projectsxtrial_types;
create view public.genotyping_projectsxtrial_types as (
    select distinct nd_experiment_project.project_id as genotyping_project_id, projectprop.type_id as trial_type_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( nd_experiment_stock.stock_id = stock_relationship.subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project as plot_trial on (nd_experiment_plot.nd_experiment_id = plot_trial.nd_experiment_id)
    join projectprop on (projectprop.project_id = plot_trial.project_id)
    join cvterm on (projectprop.type_id = cvterm.cvterm_id and cvterm.cv_id = $project_type_cv_id)
);
alter view public.genotyping_projectsxtrial_types owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_projectsxtrials
-- Objective: Link genotyping projects to tissue samples that are found in trials.
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get plots of those tissue samples.
--   3. Get trials the plots are in.

drop view public.genotyping_projectsxtrials;
create view public.genotyping_projectsxtrials as (
    select distinct nd_experiment_project.project_id as genotyping_project_id, plot_trial.project_id as trial_id
    from nd_experiment_genotype
    join nd_experiment_project using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project as plot_trial on (nd_experiment_plot.nd_experiment_id = plot_trial.nd_experiment_id)
);
alter view public.genotyping_projectsxtrials owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projects
-- Objective: Get all genotyping projects.
-- Reason for Change: Avoid use of subqueries.
-- Steps:
--  1. Get all projects that are genotyping data projects.

drop view public.genotyping_projects;
create view public.genotyping_projects as (
    select distinct project.project_id as genotyping_project_id, project.name as genotyping_project_name
    from project
    join projectprop on (projectprop.project_id = project.project_id and value = 'genotype_data_project' and projectprop.type_id = $trial_design_cvterm_id)
);
alter view public.genotyping_projects owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxyears
-- Objective: Link genotyping projects to tissue samples that are found in trials
--            according to genotyping project year.
-- Reason for Change: Avoid use of subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   3. Get genotyping project the tissue samples are in.
--   4. Get year of the genotyping data project.


drop view public.genotyping_projectsxyears;
create view public.genotyping_projectsxyears as (
    select distinct project.project_id as genotyping_project_id, year.value as year_id
    from project
    join projectprop on (projectprop.project_id = project.project_id and value = 'genotype_data_project' and projectprop.type_id = $trial_design_cvterm_id)
    join projectprop as year on (year.project_id = project.project_id and year.type_id = $project_year_cvterm_id)
);
alter view public.genotyping_projectsxyears owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocols
-- Objective: Get all genotyping protocols.
-- Reason for Change: Avoid use of subqueries.
-- Steps:
--  1. Get all protocols that are genotyping protocols;

drop view public.genotyping_protocols;
create view public.genotyping_protocols as (
    select distinct nd_protocol_id as genotyping_protocol_id, name as genotyping_protocol_name
    from nd_protocol
    where type_id = $genotyping_experiment_cvterm_id
);
alter view public.genotyping_protocols owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxlocations
-- Objective: Link genotyping protocols to the locations
--            of the genotyping material, according to
--            where the trial of the parent plot is.
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plots of tissue samples.
--   3. Get trial plot is in.
--   4. Get location where trial is.


drop view public.genotyping_protocolsxlocations;
create view public.genotyping_protocolsxlocations as (
    select distinct nd_protocol_id as genotyping_protocol_id, (projectprop.value)::integer as location_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project on (nd_experiment_plot.nd_experiment_id = nd_experiment_project.nd_experiment_id)
    join projectprop on ( nd_experiment_project.project_id = projectprop.project_id and projectprop.type_id = $project_location_cvterm_id )
);
alter view public.genotyping_protocolsxlocations owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxorganisms
-- Objective: Link genotyping protocols to organisms of genotyped material.
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples and accessions.
--   2. Get organisms of genotyped stocks.

drop view public.genotyping_protocolsxorganisms;
create view public.genotyping_protocolsxorganisms as (
    select distinct nd_protocol_id as genotyping_protocol_id, coalesce(tissue_sample.organism_id, accession.organism_id) as organism_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    left join stock_relationship on ( stock_id = stock_relationship.subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    left join stock as tissue_sample on ( object_id = tissue_sample.stock_id and tissue_sample.type_id = $accession_cvterm_id )
    left join stock as accession on ( nd_experiment_stock.stock_id = accession.stock_id and accession.type_id = $accession_cvterm_id )
    where coalesce(tissue_sample.organism_id, accession.organism_id) is not null
);
alter view public.genotyping_protocolsxorganisms owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxplants
-- Objective: Link genotyping protocols to plants who have genotyped tissue samples.
-- Reason for Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plants of tissue samples.

drop view public.genotyping_protocolsxplants;
create view public.genotyping_protocolsxplants as (
    select distinct nd_protocol_id as genotyping_protocol_id, plant.stock_id as plant_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on (stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id)
    join stock as plant on (object_id = plant.stock_id and plant.type_id = $plant_cvterm_id)
);
alter view public.genotyping_protocolsxplants owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxplots
-- Objective: Link genotyping protocols to plots who have genotyped tissue samples.
-- Reason for Change: Pre-existing view incorrectly reported non-related plots as part of genotyping protocol.
--                    Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plots of tissue samples.

drop view public.genotyping_protocolsxplots;
create view public.genotyping_protocolsxplots as (
    select distinct nd_protocol_id as genotyping_protocol_id, plot.stock_id as plot_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    join stock as plot on ( object_id = plot.stock_id and plot.type_id = $plot_cvterm_id )
);
alter view public.genotyping_protocolsxplots owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxseedlots
-- Objective: Link genotyping protocols to tissue samples that are in plots with known seeds.
-- Reason for Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent plots.
--   3. Get seedlots planted in plots.

drop view public.genotyping_protocolsxseedlots;
create view public.genotyping_protocolsxseedlots as (
    select distinct nd_protocol_id as genotyping_protocol_id, seedlot_of_plot.object_id as seedlot_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join stock_relationship as seedlot_of_plot on (plot.stock_id = seedlot_of_plot.subject_id and seedlot_of_plot.type_id = $seed_transaction_cvterm_id)
);
alter view public.genotyping_protocolsxseedlots owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxsubplots
-- Objective: Link genotyping protocols to subplots who have genotyped tissue samples.
-- Reason for Change: Pre-existing view incorrectly reported non-related plots as part of genotyping protocol.
--                    Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get parent subplots of tissue samples.

drop view public.genotyping_protocolsxsubplots;
create view public.genotyping_protocolsxsubplots as (
    select distinct nd_protocol_id as genotyping_protocol_id, subplot.stock_id as subplot_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id and stock_relationship.type_id = $tissue_sample_of_cvterm_id )
    join stock as subplot on ( subplot.stock_id = object_id and subplot.type_id = $subplot_cvterm_id )
);
alter view public.genotyping_protocolsxsubplots owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxtissue_sample
-- Objective: Link genotyping protocols to genotyped tissue samples.
-- Reason for Change: Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples
-- Reminder: Table name is non-pluralized (tissue_sample) for legacy support

drop view public.genotyping_protocolsxtissue_sample;
create view public.genotyping_protocolsxtissue_sample as (
    select distinct nd_protocol_id as genotyping_protocol_id, tissue_sample.stock_id as tissue_sample_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
);
alter view public.genotyping_protocolsxtissue_sample owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxtrait_components
-- Objective: Link genotyping protocols to stocks phenotyped using composed traits.
--            The tissue sample may be genotyped or any of its parents (plant, plot, etc.)
-- Reason for Change: Pre-existing view incorrectly returned no results.
--                    Avoid use of materialized view and subqueries.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Also get parents of genotyped tissue samples.
--   3. Get phenotypes of both tissue samples or parents.
--   4. Get trait components of phenotypes.
-- Note: I would prefer this view did not utilize a subquery.

drop view public.genotyping_protocolsxtrait_components;
create view public.genotyping_protocolsxtrait_components as (
    with genotyped_stocks as (
        -- directly genotyped tissue samples
        select nd_protocol_id as genotyping_protocol_id, tissue_sample.stock_id
        from nd_experiment_genotype
        join nd_experiment_protocol using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        union
        -- parents of genotyped tissue samples (plants, plots, accessions, etc.)
        select nd_protocol_id as genotyping_protocol_id, object_id as stock_id
        from nd_experiment_genotype
        join nd_experiment_protocol using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        join stock_relationship on (tissue_sample.stock_id = subject_id)
    )
    select distinct genotyping_protocol_id, subject_id as trait_component_id
    from genotyped_stocks
    join nd_experiment_stock using (stock_id)
    join nd_experiment_phenotype using (nd_experiment_id)
    join phenotype using (phenotype_id)
    join cvterm_relationship on (object_id = observable_id)
);
alter view public.genotyping_protocolsxtrait_components owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxtraits
-- Objective: Link genotyping protocols to tissue samples that have been phenotyped.
--            The tissue sample may be genotyped or any of its parents (plant, plot, etc.)
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Also get parents of genotyped tissue samples.
--   3. Get phenotypes of both tissue samples or parents.
-- Note: I would prefer this view did not utilize a subquery.

drop view public.genotyping_protocolsxtraits;
create view public.genotyping_protocolsxtraits as (
    with genotyped_stocks as (
        -- directly genotyped tissue samples
        select nd_protocol_id as genotyping_protocol_id, tissue_sample.stock_id
        from nd_experiment_genotype
        join nd_experiment_protocol using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        union
        -- parents of genotyped tissue samples (plants, plots, accessions, etc.)
        select nd_protocol_id as genotyping_protocol_id, object_id as stock_id
        from nd_experiment_genotype
        join nd_experiment_protocol using (nd_experiment_id)
        join nd_experiment_stock using (nd_experiment_id)
        join stock as tissue_sample on (tissue_sample.stock_id = nd_experiment_stock.stock_id and tissue_sample.type_id = $tissue_sample_cvterm_id)
        join stock_relationship on (tissue_sample.stock_id = subject_id)
    )
    select distinct genotyping_protocol_id, observable_id as trait_id
    from genotyped_stocks
    join nd_experiment_stock using (stock_id)
    join nd_experiment_phenotype using (nd_experiment_id)
    join phenotype using (phenotype_id)
);
alter view public.genotyping_protocolsxtraits owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_protocolsxtrial_designs
-- Objective: Link genotyping protocols to tissue samples that are found in trials
--            according to trial design.
-- Reason for Change: Avoid use of materialized view and subqueries.
--   1. Get genotyped tissue samples.
--   2. Get plots of those tissue samples.
--   3. Get trials the plots are in.
--   4. Get design of the trial.

drop view public.genotyping_protocolsxtrial_designs;
create view public.genotyping_protocolsxtrial_designs as (
    select distinct nd_protocol_id as genotyping_protocol_id, projectprop.value as trial_design_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( nd_experiment_stock.stock_id = stock_relationship.subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id)
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project on (nd_experiment_plot.nd_experiment_id = nd_experiment_project.nd_experiment_id)
    join projectprop on ( nd_experiment_project.project_id = projectprop.project_id and projectprop.type_id = $trial_design_cvterm_id )
);
alter view public.genotyping_protocolsxtrial_designs owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_protocolsxtrial_types
-- Objective: Link genotyping protocols to tissue samples that are found in trials
--            according to trial type.
-- Reason for Change: Avoid use of materialized view and subqueries.
--   1. Get genotyped tissue samples.
--   2. Get plots of those tissue samples.
--   3. Get trials the plots are in.
--   4. Get type of the trial.

-- View: public.genotyping_protocolsxtrial_types
-- Same as genotyping_protocolsxtrials, but after getting
-- the project we also get the property of what type it is

drop view public.genotyping_protocolsxtrial_types;
create view public.genotyping_protocolsxtrial_types as (
    select distinct nd_protocol_id as genotyping_protocol_id, projectprop.type_id as trial_type_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( nd_experiment_stock.stock_id = stock_relationship.subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project on (nd_experiment_plot.nd_experiment_id = nd_experiment_project.nd_experiment_id)
    join projectprop using (project_id)
    join cvterm on (projectprop.type_id = cvterm.cvterm_id and cvterm.cv_id = $project_type_cv_id)
);
alter view public.genotyping_protocolsxtrial_types owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_protocolsxtrials
-- Objective: Link genotyping protocols to tissue samples that are found in trials.
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   2. Get plots of those tissue samples.
--   3. Get trials the plots are in.

drop view public.genotyping_protocolsxtrials;
create view public.genotyping_protocolsxtrials as (
    select distinct nd_protocol_id as genotyping_protocol_id, project_id as trial_id
    from nd_experiment_genotype
    join nd_experiment_protocol using (nd_experiment_id)
    join nd_experiment_stock using (nd_experiment_id)
    join stock_relationship on ( stock_id = subject_id )
    join stock as plot on ( plot.stock_id = object_id and plot.type_id = $plot_cvterm_id )
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project on (nd_experiment_plot.nd_experiment_id = nd_experiment_project.nd_experiment_id)
);
alter view public.genotyping_protocolsxtrials owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxyears
-- Objective: Link genotyping protocols to tissue samples that are found in trials
--            according to genotyping project year.
-- Reason for Change: Avoid use of materialized view.
-- Steps:
--   1. Get genotyped tissue samples.
--   3. Get genotyping project the tissue samples are in.
--   4. Get year of the genotyping data project.

drop view public.genotyping_protocolsxyears;
create view public.genotyping_protocolsxyears as (
    select distinct nd_protocol_id as genotyping_protocol_id, year.value as year_id
    from nd_experiment_protocol
    join nd_experiment_project using (nd_experiment_id)
    join project using (project_id)
    join projectprop on (projectprop.project_id = project.project_id and value = 'genotype_data_project' and projectprop.type_id = $trial_design_cvterm_id)
    join projectprop as year on (year.project_id = project.project_id and year.type_id = $project_year_cvterm_id)
);
alter view public.genotyping_protocolsxyears owner to web_usr;


EOSQL

    print "You're done!\n";
}

####
1; #
####