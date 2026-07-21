#!/usr/bin/env perl

=head1 NAME

AddStakeAndSetCvterms.pm

=head1 SYNOPSIS

mx-run AddStakeAndSetCvterms [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION

This patch adds the 'stake_number' and 'set_number' cvterms to the 'stock_property' cv.

=head1 AUTHOR

Seth Traverse <setraver@ualberta.ca>

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

package AddStakeAndSetCvterms;

use Moose;
extends 'CXGN::Metadata::Dbpatch';

has '+description' => ( default => 'Adds stake_number and set_number cvterms to the stock_property cv' );

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " . $self->name . ".\n\nDescription:\n  " . $self->description . ".\n\nExecuted by:\n " . $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    print STDOUT "\nExecuting the SQL commands.\n";

    # Insert 'stake_number' property
    $self->dbh->do(<<EOSQL);
INSERT INTO cvterm (cv_id, name, definition)
SELECT cv_id, 'stake_number', 'Stake identifier for a plot'
FROM cv WHERE name = 'stock_property'
ON CONFLICT (name, cv_id, is_obsolete) DO NOTHING;
EOSQL

    # Insert 'set_number' property
    $self->dbh->do(<<EOSQL);
INSERT INTO cvterm (cv_id, name, definition)
SELECT cv_id, 'set_number', 'Set identifier for a plot'
FROM cv WHERE name = 'stock_property'
ON CONFLICT (name, cv_id, is_obsolete) DO NOTHING;
EOSQL

    print "You're done!\n";
}

####
1; #
####
