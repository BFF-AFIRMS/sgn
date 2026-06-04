package CXGN::Phenotypes::Missing;

=head1 NAME

CXGN::Phenotypes::Missing - an object to converting a phenotype value to an appropriate missing data format

=head1 USAGE

# Returns 3, as 3 is a proper value
CXGN::Phenotypes::Missing->convert(3, 'empty');

# Returns 'NA'
CXGN::Phenotypes::Missing->convert(undef, 'NA');

# Returns '.'
CXGN::Phenotypes::Missing->convert(0, 'period');

=head1 DESCRIPTION


=head1 AUTHORS

Katherine Eaton <kmeaton1@ualberta.ca>

=cut

use Moose;

sub convert {
    my $self = shift;
    my $value = shift;
    my $missing_format = shift;

    if(!defined $value || ! length $value) {

        if ($missing_format eq 'NA'){
            $value = 'NA';
        } elsif ($missing_format eq 'period'){
            $value = '.';
        } else {
            $value = '';
        }
    }

    return $value;
}


1;
