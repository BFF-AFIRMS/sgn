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

# Returns undef
CXGN::Phenotypes::Missing->convert(undef, 'undef');

=head1 DESCRIPTION


=head1 AUTHORS

Katherine Eaton <kmeaton1@ualberta.ca>

=cut

use Moose;
use Exporter qw(import);

our @ISA= qw( Exporter );

# these CAN be exported.
our @EXPORT_OK = qw( %MISSING_FORMATS @DOWNLOAD_MISSING_FORMATS );

# these are exported by default.
our @EXPORT = qw( %MISSING_FORMATS @DOWNLOAD_MISSING_FORMATS );

# all allowed missing formats
our %MISSING_FORMATS = (
    "empty"  => "",
    "NA"     => "NA",
    "period" => ".",
    "undef"  => undef,
);

# missing formats available when downloading to a file
our @DOWNLOAD_MISSING_FORMATS = ("empty", "NA", "period");

sub convert {
    my $self = shift;
    my $value = shift;
    my $missing_format = shift;

    if(!defined $value || ! length $value) {
        $value = $MISSING_FORMATS{$missing_format};
    }

    return $value;
}


1;
