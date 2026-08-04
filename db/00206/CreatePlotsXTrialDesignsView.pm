#!/usr/bin/env perl

=head1 NAME

CreatePlotsXTrialDesignsView.pm

=head1 SYNOPSIS

mx-run CreatePlotsXTrialDesignsView [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch:
 - Creates a new view plotsxtrial_designs for tool compatibility for datasets with plots.

=head1 AUTHOR

Katherine Eaton

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package CreatePlotsXTrialDesignsView;

use Moose;
use Bio::Chado::Schema;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => <<'' );
This patch creates a new view plotsxtrial_designs for tool compatibility for datasets with plots.

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " .   $self->name . ".\n\nDescription:\n  ".  $self->description . ".\n\nExecuted by:\n " .  $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    print STDOUT "\nExecuting the SQL commands.\n";

    $self->dbh->do(<<EOSQL);
create view public.plotsxtrial_designs as (
    select
        stock.stock_id as plot_id,
        trialdesign.value as trial_design_id
    from materialized_phenoview
    join projectprop trialdesign on (
        materialized_phenoview.trial_id = trialdesign.project_id
        and trialdesign.type_id = (select cvterm.cvterm_id from cvterm where cvterm.name::text = 'design')
    )
    join stock on (
        materialized_phenoview.stock_id = stock.stock_id
        and stock.type_id = (select cvterm.cvterm_id from cvterm where cvterm.name = 'plot')
    )
    group by trialdesign.value, stock.stock_id
);
alter view public.plotsxtrial_designs owner to web_usr;

EOSQL

    print "You're done!\n";
}

####
1; #
####
