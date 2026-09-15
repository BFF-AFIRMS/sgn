#!/usr/bin/env perl

=head1 NAME

FixSpatialCorrectionDbxref.pm

=head1 SYNOPSIS

mx-run FixSpatialCorrectionDbxref [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch fixes the spatial correction dbxref to use the SGNSTAT db.

=head1 AUTHOR

Katherine Eaton <kmeaton1@ualberta.ca>

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package FixSpatialCorrectionDbxref;

use Moose;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => 'Fixes the spatial correction dbxref to use the SGNSTAT db.' );

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " . $self->name . ".\n\nDescription:\n  " . $self->description . ".\n\nExecuted by:\n " . $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    print STDOUT "\nFetching Cvterms.\n";

    print STDOUT "\nExecuting the SQL commands.\n";

    # Note: The accession number comes from the ontology definition at: ontology/cxgn_statistics.obo
    $self->dbh->do(<<EOSQL);
update dbxref
set
    db_id = (select db_id from db where name = 'SGNSTAT'),
    accession = '0000054'
where accession = 'autocreated:Adjusted Means from Spatial Correction using SpATS R';
EOSQL

    print "You're done!\n";
}

####
1; #
####