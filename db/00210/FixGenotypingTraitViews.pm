#!/usr/bin/env perl

=head1 NAME

FixGenotypingTraitViews.pm

=head1 SYNOPSIS

mx-run FixGenotypingTraitViews [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch fixes genotyping views involving traits to incorporate accessions.

=head1 AUTHOR

Katherine Eaton <kmeaton1@ualberta.ca>

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package FixGenotypingTraitViews;

use SGN::Model::Cvterm;
use Bio::Chado::Schema;
use Moose;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => 'Fixes genotyping views involving traits to incorporate accessions.' );

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " . $self->name . ".\n\nDescription:\n  " . $self->description . ".\n\nExecuted by:\n " . $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );
    my $plot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot', 'stock_type')->cvterm_id();
    my $project_type_cv_id = $schema->resultset("Cv::Cv")->find({ name => 'project_type'})->cv_id();
    my $trial_design_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'design', 'project_property')->cvterm_id();


    print STDOUT "\nExecuting the SQL commands.\n";

    $self->dbh->do(<<EOSQL);
-------------------------------------------------------------------------------
-- View: genotyping_projectsxtraits
-- Objective: Link genotyping projects to phenotypes. Phenotypes may be linked
--            to a stock directly (ex. tissue sample or accession), or it may
--            be inherited from its children/parents (ex. plots, plants).
-- Reason for Change: Parent/child phenotype inheritance was not accounted for.
-- Steps:
--   1. Get directly genotyped stocks (ex. tissue samples and accessions).
--   2. Also get parents and children of genotyped stocks.
--   3. Get direct phenotypes of stocks as well as inherited from parents/children.

drop view public.genotyping_projectsxtraits;
create view public.genotyping_projectsxtraits as (
    with genotyped_stocks_child_parent as (
        with genotyped_stocks as (
            select project_id as genotyping_project_id, stock.stock_id, stock.type_id
            from nd_experiment_genotype
            join nd_experiment_project using (nd_experiment_id)
            join nd_experiment_stock using (nd_experiment_id)
            join stock on (stock.stock_id = nd_experiment_stock.stock_id)
        )
        -- all genotyped stocks
        select genotyping_project_id, stock_id
        from genotyped_stocks
        union
        -- parents of genotyped stocks
        select genotyping_project_id, parent.object_id as stock_id
        from genotyped_stocks as child
        join stock_relationship as parent on (child.stock_id = parent.subject_id)
        union
        -- children of genotyped stocks
        select genotyping_project_id, child.subject_id
        from genotyped_stocks as parent
        join stock_relationship as child on (parent.stock_id = child.object_id)
    )
    select distinct genotyping_project_id, observable_id as trait_id
    from genotyped_stocks_child_parent
    join nd_experiment_stock using (stock_id)
    join nd_experiment_phenotype using (nd_experiment_id)
    join phenotype using (phenotype_id)
);
alter view public.genotyping_projectsxtraits owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_projectsxtrait_components
-- Objective: Link genotyping projects to stocks phenotyped using composed traits.
--            Phenotypes may be linked to a stock directly (ex. tissue sample or
--            accession), or it may be inherited from its children/parents (ex.
--            plots/plants).
-- Reason for Change: Parent/child phenotype inheritance was not accounted for.
-- Steps:
--   1. Get genotyping projects linked to phenotypes.
--   2. Get trait components of phenotypes.

drop view public.genotyping_projectsxtrait_components;
create view public.genotyping_projectsxtrait_components as (
    select distinct genotyping_project_id, cvterm_relationship.subject_id
    from genotyping_projectsxtraits
    join cvterm_relationship on (object_id = trait_id)
);
alter view public.genotyping_projectsxtrait_components owner to web_usr;


------------------------------------------------------------------------------
-- View: public.genotyping_projectsxtrials
-- Objective: Link genotyping projects to stocks that are found in trials.
-- Reason for Change: Restore links to accessions.
-- Steps:
--   1. Get plots in trials.
--   2. Get parent and child stocks of plots.
--   3. Get genotyping projects linked to stocks.

drop view public.genotyping_projectsxtrials;
create view public.genotyping_projectsxtrials as (
    with trial_stock as (
        with plot as (
            select projectprop.project_id as trial_id, plot.stock_id
            from stock as plot
            join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
            join nd_experiment_project on (nd_experiment_plot.nd_experiment_id = nd_experiment_project.nd_experiment_id)
            join projectprop using (project_id)
            join cvterm on (projectprop.type_id = cvterm.cvterm_id and cvterm.cv_id = $project_type_cv_id)
            where plot.type_id = $plot_cvterm_id
            )
        -- plots
        select trial_id, stock_id from plot
        union
        -- parents of plot
        select trial_id, parent.object_id from plot join stock_relationship as parent on (plot.stock_id = parent.subject_id)
        union
        -- children of plot
        select trial_id, child.subject_id from plot join stock_relationship as child on (plot.stock_id = child.object_id)
    )
    -- get stocks associated with genotyping projects
    select distinct project_id as genotyping_project_id, trial_id
    from trial_stock
    join nd_experiment_stock using (stock_id)
    join nd_experiment_project using (nd_experiment_id)
);
alter view public.genotyping_protocolsxtrials owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxtraits
-- Objective: Link genotyping protocols to phenotypes. Phenotypes may be linked
--            to a stock directly (ex. tissue sample or accession), or it may
--            be inherited from its children/parents.
-- Reason for Change: Parent/child phenotype inheritance was not accounted for.
-- Steps:
--   1. Get directly genotyped stocks (ex. tissue samples and accessions).
--   2. Also get parents and children of genotyped stocks.
--   3. Get direct phenotypes of stocks as well as inherited from parents/children.

drop view public.genotyping_protocolsxtraits;
create view public.genotyping_protocolsxtraits as (
    with genotyped_stocks_child_parent as (
        with genotyped_stocks as (
            select nd_protocol_id as genotyping_protocol_id, stock.stock_id, stock.type_id
            from nd_experiment_genotype
            join nd_experiment_protocol using (nd_experiment_id)
            join nd_experiment_stock using (nd_experiment_id)
            join stock on (stock.stock_id = nd_experiment_stock.stock_id)
        )
        -- all genotyped stocks
        select genotyping_protocol_id, stock_id
        from genotyped_stocks
        union
        -- parents of genotyped stocks
        select genotyping_protocol_id, parent.object_id as stock_id
        from genotyped_stocks as child
        join stock_relationship as parent on (child.stock_id = parent.subject_id)
        union
        -- children of genotyped stocks
        select genotyping_protocol_id, child.subject_id
        from genotyped_stocks as parent
        join stock_relationship as child on (parent.stock_id = child.object_id)
    )
    select distinct genotyping_protocol_id, observable_id as trait_id
    from genotyped_stocks_child_parent
    join nd_experiment_stock using (stock_id)
    join nd_experiment_phenotype using (nd_experiment_id)
    join phenotype using (phenotype_id)
);
alter view public.genotyping_protocolsxtraits owner to web_usr;


-------------------------------------------------------------------------------
-- View: genotyping_protocolsxtrait_components
-- Objective: Link genotyping protocols to stocks phenotyped using composed traits.
--            Phenotypes may be linked to a stock directly (ex. tissue sample or
--            accession), or it may be inherited from its children/parents.
-- Reason for Change: Parent/child phenotype inheritance was not accounted for.
--   1. Get genotyping protocols linked to phenotypes.
--   2. Get trait components of phenotypes.

drop view public.genotyping_protocolsxtrait_components;
create view public.genotyping_protocolsxtrait_components as (
    select distinct genotyping_protocol_id, cvterm_relationship.subject_id
    from genotyping_protocolsxtraits
    join cvterm_relationship on (object_id = trait_id)
);
alter view public.genotyping_protocolsxtrait_components owner to web_usr;


------------------------------------------------------------------------------
-- View: public.genotyping_protocolsxtrials
-- Objective: Link genotyping protocols to stocks that are found in trials.
-- Reason for Change: Restore links to accessions.
-- Steps:
--   1. Get plots in trials.
--   2. Get parent and child stocks of plots.
--   3. Get genotyping protocols linked to stocks.

drop view public.genotyping_protocolsxtrials;
create view public.genotyping_protocolsxtrials as (
    with trial_stock as (
        with plot as (
            select projectprop.project_id as trial_id, plot.stock_id
            from stock as plot
            join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
            join nd_experiment_project on (nd_experiment_plot.nd_experiment_id = nd_experiment_project.nd_experiment_id)
            join projectprop using (project_id)
            join cvterm on (projectprop.type_id = cvterm.cvterm_id and cvterm.cv_id = $project_type_cv_id)
            where plot.type_id = $plot_cvterm_id
            )
        -- plots
        select trial_id, stock_id from plot
        union
        -- parents of plot
        select trial_id, parent.object_id from plot join stock_relationship as parent on (plot.stock_id = parent.subject_id)
        union
        -- children of plot
        select trial_id, child.subject_id from plot join stock_relationship as child on (plot.stock_id = child.object_id)
    )
    -- get stocks associated with genotyping protocols
    select distinct nd_protocol_id as genotyping_protocol_id, trial_id
    from trial_stock
    join nd_experiment_stock using (stock_id)
    join nd_experiment_protocol using (nd_experiment_id)
);
alter view public.genotyping_protocolsxtrials owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_protocolsxtrial_designs
-- Objective: Link genotyping protocols to stocks that are found in trials
--            according to trial design.
-- Reason for Change: Restore links to accessions.
-- Steps:
--   1. Get genotyping projects linked to trials.
--   2. Get name of trial design as text (even though column name is trial_design_id).

drop view public.genotyping_protocolsxtrial_designs;
create view public.genotyping_protocolsxtrial_designs as (
    select distinct genotyping_protocol_id, projectprop.value as trial_design_id
    from genotyping_protocolsxtrials
    join projectprop on (trial_id = project_id and type_id = $trial_design_cvterm_id);
);
alter view public.genotyping_protocolsxtrial_designs owner to web_usr;


-------------------------------------------------------------------------------
-- View: public.genotyping_protocolsxtrial_types
-- Objective: Link genotyping protocols to stocks that are found in trials
--            according to trial type.
-- Reason for Change: Restore links to accessions.
-- Steps:
--   1. Get genotyping projects linked to trials.
--   2. Get id of trial type.

drop view public.genotyping_protocolsxtrial_designs;
create view public.genotyping_protocolsxtrial_designs as (
    select distinct genotyping_protocol_id, projectprop.type_id as trial_type_id
    from genotyping_protocolsxtrials
    join projectprop on (trial_id = project_id)
    join cvterm on (type_id = cvterm_id and cv_id = $project_type_cv_id);
);
alter view public.genotyping_protocolsxtrial_designs owner to web_usr;

# EOSQL

    print "You're done!\n";
}

####
1; #
####