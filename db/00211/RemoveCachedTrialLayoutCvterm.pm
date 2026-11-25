#!/usr/bin/env perl


=head1 NAME

 RemoveCachedTrialLayoutCvterm

=head1 SYNOPSIS

mx-run RemoveCachedTrialLayoutCvterm [options] -H hostname -D dbname -u username [-F]

this is a subclass of L<CXGN::Metadata::Dbpatch>
see the perldoc of parent class for more details.

=head1 DESCRIPTION
This patch removes the 'trial_layout_json' cvterm from the 'project_property' cv,
along with any projectprop rows that stored a cached trial layout in json. The
trial layout is now generated directly from the database and is no longer cached.
This subclass uses L<Moose>. The parent class uses L<MooseX::Runnable>

=head1 AUTHOR

Seth Traverse <setraver@ualberta.ca>

=head1 COPYRIGHT & LICENSE

Copyright 2026 University of Alberta

This program is free software; you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut


package RemoveCachedTrialLayoutCvterm;

use Moose;
use Bio::Chado::Schema;
use Try::Tiny;
use SGN::Model::Cvterm;
extends 'CXGN::Metadata::Dbpatch';


has '+description' => ( default => <<'' );
This patch removes the trial_layout_json cvterm and any projectprop rows used to cache a trial layout in json.

has '+prereq' => (
	default => sub {
        [],
    },

);

sub patch {
    my $self=shift;

    print STDOUT "Executing the patch:\n " .   $self->name . ".\n\nDescription:\n  ".  $self->description . ".\n\nExecuted by:\n " .  $self->username . " .";

    print STDOUT "\nChecking if this db_patch was executed before or if previous db_patches have been executed.\n";

    print STDOUT "\nExecuting the SQL commands.\n";
    my $schema = Bio::Chado::Schema->connect( sub { $self->dbh->clone } );

    print STDERR "REMOVING CACHED TRIAL LAYOUT CVTERM AND PROJECTPROPS...\n";

    my $coderef = sub {
        my $cvterm = SGN::Model::Cvterm->get_cvterm_row($schema, 'trial_layout_json', 'project_property');
        if (!$cvterm) {
            print STDERR "Cvterm 'trial_layout_json' does not exist in the database. Nothing to do.\n";
            return;
        }
        my $cvterm_id = $cvterm->cvterm_id();
        my $dbxref_id = $cvterm->dbxref_id();

        # Remove any cached trial layouts stored as projectprops
        my $projectprop_rs = $schema->resultset('Project::Projectprop')->search({ type_id => $cvterm_id });
        my $deleted_props = $projectprop_rs->count();
        $projectprop_rs->delete();
        print STDERR "Deleted $deleted_props cached trial layout projectprop row(s).\n";

        # Remove any cvterm relationships referencing this cvterm
        $schema->resultset('Cv::CvtermRelationship')->search({ subject_id => $cvterm_id })->delete();
        $schema->resultset('Cv::CvtermRelationship')->search({ object_id => $cvterm_id })->delete();

        $cvterm->delete();
        print STDERR "Deleted cvterm 'trial_layout_json' ($cvterm_id).\n";

        # Remove the cvterm's dbxref if it is no longer referenced by any cvterm
        if ($dbxref_id) {
            my $remaining = $schema->resultset('Cv::Cvterm')->search({ dbxref_id => $dbxref_id })->count();
            if ($remaining == 0) {
                $schema->resultset('General::Dbxref')->search({ dbxref_id => $dbxref_id })->delete();
                print STDERR "Deleted orphaned dbxref ($dbxref_id).\n";
            }
        }
    };

    try {
        $schema->txn_do($coderef);
    } catch {
        die "Load failed! " . $_ .  "\n" ;
    };

    print "You're done!\n";
}


####
1; #
####
