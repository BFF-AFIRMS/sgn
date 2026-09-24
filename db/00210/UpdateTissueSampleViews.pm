#!/usr/bin/env perl

=head1 NAME

UpdateTissueSampleViews.pm

=head1 SYNOPSIS

mx-run UpdateTissueSampleViews [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch updates tissue sample views.

=head1 AUTHOR

Katherine Eaton <kmeaton1@ualberta.ca>

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package UpdateTissueSampleViews;

use SGN::Model::Cvterm;
use Bio::Chado::Schema;
use Moose;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => 'Updates tissue sample views.' );

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " . $self->name . ".\n\nDescription:\n  " . $self->description . ".\n\nExecuted by:\n " . $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );
    my $plot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'plot', 'stock_type')->cvterm_id();
    my $seedlot_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'seedlot', 'stock_type')->cvterm_id();
    my $tissue_sample_cvterm_id = SGN::Model::Cvterm->get_cvterm_row($schema, 'tissue_sample', 'stock_type')->cvterm_id();

    print STDOUT "\nExecuting the SQL commands.\n";

    # tissue_sampelextrials
    # tissue_samplexseedlots; = MISSING

    $self->dbh->do(<<EOSQL);
-------------------------------------------------------------------------------
-- View: tissue_samplextrials;
-- Objective: Link tissue samples to trials.
-- Reason for Change: Tissue samples were missing trial links.
--                    Avoid use of materialized view.
-- Steps:
--   1. Get all tissue samples.
--   2. Get all parent plots.
--   3. Get all trials plots are found in.

drop view public.tissue_samplextrials;
create view public.tissue_samplextrials as (
    select tissue_sample.stock_id as tissue_sample_id, plot_trial.project_id as trial_id
    from stock as tissue_sample
    join stock_relationship as tissue_sample_of on ( tissue_sample_of.subject_id = tissue_sample.stock_id )
    join stock as plot on (plot.stock_id = tissue_sample_of.object_id)
    join nd_experiment_stock as nd_experiment_plot on (plot.stock_id = nd_experiment_plot.stock_id)
    join nd_experiment_project as plot_trial on (nd_experiment_plot.nd_experiment_id = plot_trial.nd_experiment_id)
    where tissue_sample.type_id = $tissue_sample_cvterm_id and plot.type_id = $plot_cvterm_id
);
alter view public.tissue_samplextrials owner to web_usr;

-------------------------------------------------------------------------------
-- View: seedlotsxtissue_sample;
-- Objective: Link tissue samples to seedlots.
-- Reason for Change: Tissue samples were missing seedlot links.
-- Steps:
--   1. Get all tissue samples.
--   2. Get all parent plots.
--   3. Get all seedlots planted in plots.

create view public.seedlotsxtissue_sample as (
    select distinct seedlot.stock_id as seedlot_id, tissue_sample.stock_id as tissue_sample_id
    from stock as tissue_sample
    join stock_relationship as tissue_sample_of on (tissue_sample_of.subject_id = tissue_sample.stock_id)
    join stock as plot on (plot.stock_id = tissue_sample_of.object_id)
    join stock_relationship as seed_transaction on (seed_transaction.subject_id = plot.stock_id)
    join stock as seedlot on (seedlot.stock_id = seed_transaction.object_id)
    where tissue_sample.type_id = $tissue_sample_cvterm_id and plot.type_id = $plot_cvterm_id and seedlot.type_id = $seedlot_cvterm_id
);
alter view public.seedlotsxtissue_sample owner to web_usr;

EOSQL

    print "You're done!\n";
}

####
1; #
####