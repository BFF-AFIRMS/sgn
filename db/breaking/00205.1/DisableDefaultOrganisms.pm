#!/usr/bin/env perl

=head1 NAME

DisableDefaultOrganisms.pm

=head1 SYNOPSIS

mx-run DisableDefaultOrganisms [options] [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch:
 - disables access to the default organisms (100,000k)

=head1 AUTHOR

Katherine Eaton

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package DisableDefaultOrganisms;

use Moose;
use Bio::Chado::Schema;
use SGN::Model::Cvterm;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => <<'' );
This patch disables access to the default organisms (100,000k).


sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " .   $self->name . ".\n\nDescription:\n  ".  $self->description . ".\n\nExecuted by:\n " .  $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    $self->dbh->do(<<EOSQL);
-- make a backup
create table public.organism_default as table public.organism;
delete from public.organism where (common_name != 'lodgepole pine' and common_name != 'white spruce') or (common_name is null);
EOSQL

    print "You're done!\n";
}

####
1; #
####
