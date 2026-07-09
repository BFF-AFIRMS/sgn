package Shared::Phenotypes;

=head1 NAME

Shared::Phenotypes - Shared functions for testing phenotypes

=cut

use strict;
use warnings;
use Exporter qw(import);
use File::Slurp qw(read_file);
use CXGN::Phenotypes::Missing;

# Default exports
our @EXPORT = qw/
    download_missing_phenotypes_csv
/;

sub download_missing_phenotypes_csv {
    my ($t, $select_id, $format, $submit_id, $download_path, $expected_csv) = @_;

    # Remove any prexisting files with the same name
    unlink $download_path;

    $t->click_ok("//select[\@id='$select_id']/option[\@value='$format']", 'xpath', "Select missing format $format");
    $t->click_ok($submit_id, 'id', "Download missing format $format");

    # Wait for file to download
    my $num_attempts = 0;
    while (! -e $download_path && $num_attempts < 30){
        $num_attempts +=1;
        sleep(1);
    }

    # read downloaded file into array of lines
    my @observed = read_file($download_path, chomp => 1);

    unlink $download_path;
    return \@observed;
}

1;
