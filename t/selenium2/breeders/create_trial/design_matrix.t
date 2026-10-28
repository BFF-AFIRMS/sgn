use strict;
use warnings;

use lib 't/lib';

use Test::More;

use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;
use CXGN::List;
use Shared::AddTrial qw/
    create_trial
    design_preset
    find_trial
/;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();
my $schema = $f->bcs_schema;
my $dbh = $f->dbh;

# The lists and trials below are owned by the submitter the test logs in as.
my ($user_id) = $dbh->selectrow_array(
    "SELECT sp_person_id FROM sgn_people.sp_person WHERE username = 'johndoe'");
$user_id ||= 41;

# --- Fixture data -----------------------------------------------------------
#
# A 16-accession stock list factors by 2, 4 and 8, so the same list satisfies
# the block, row-column and augmented designs below. The checks must come from
# *different* accessions: URDD and the augmented designs merge the checks into
# the stock list, and an entry that is both a line and a check is counted
# twice, corrupting the design.
my $STOCK_COUNT = 16;
my $CHECK_COUNT = 3;

my @all_accessions = @{ $dbh->selectcol_arrayref(
    "SELECT s.uniquename
       FROM stock s
       JOIN cvterm c ON s.type_id = c.cvterm_id
      WHERE c.name = 'accession'
        AND COALESCE(s.is_obsolete, false) = false
      ORDER BY s.stock_id
      LIMIT " . ($STOCK_COUNT + $CHECK_COUNT) ) };
BAIL_OUT("Fixture needs at least " . ($STOCK_COUNT + $CHECK_COUNT)
    . " accessions (found " . scalar(@all_accessions) . ")")
    if @all_accessions < $STOCK_COUNT + $CHECK_COUNT;

my @accessions = @all_accessions[0 .. $STOCK_COUNT - 1];
my @checks     = @all_accessions[$STOCK_COUNT .. $STOCK_COUNT + $CHECK_COUNT - 1];

# Split plot treatments are typed into a CvtermAutocomplete whose suggestions
# come from the EXPERIMENT_TREATMENT database (the UI passes "_TREATMENT", which
# the backend matches with LIKE '%_TREATMENT%'). COMP_EXP_TREATMENT matches that
# pattern too, but it holds ontology metadata ("Composed experimental treatment
# ontology") rather than usable treatment values, and the save step validates
# treatment names as traits, so a real term is required.
my @treatment_names = @{ $dbh->selectcol_arrayref(
    "SELECT cvt.name
       FROM cvterm cvt
       JOIN dbxref dbx ON cvt.dbxref_id = dbx.dbxref_id
       JOIN db db ON dbx.db_id = db.db_id
      WHERE db.name = 'EXPERIMENT_TREATMENT'
        AND COALESCE(cvt.is_obsolete, 0) = 0
      ORDER BY cvt.name
      LIMIT 2"
) };
@treatment_names = ('Treatment A', 'Treatment B') unless @treatment_names;

# --- Test lists -------------------------------------------------------------

sub create_test_list {
    my ($name, $type, $items) = @_;
    my $list_id = CXGN::List::create_list($dbh, $name, "Test list $name", $user_id);
    my $list = CXGN::List->new({ dbh => $dbh, list_id => $list_id });
    $list->type($type);
    $list->add_bulk($items) if $items && @$items;
    return $list_id;
}

my $rand = int(rand(1_000_000));
my $stock_list_id  = create_test_list("Matrix_Stocks_$rand", 'accessions', \@accessions);
my $checks_list_id = create_test_list("Matrix_Checks_$rand", 'accessions', \@checks);

# --- Design matrix ----------------------------------------------------------
#
# Each row is a design type plus the fixture-specific overrides that
# design_preset() cannot supply on its own (see %DESIGN_REQUIRED_OPTIONS in
# Shared::AddTrial). The test asserts only that the trial reaches the database;
# the per-design numeric parameters live in %DESIGN_PRESETS and may need tuning
# so the R design plugins can lay each one out.
#
# NOTE: the following designs currently have errors in their R code and are untested:
# - p-rep
my @designs = (
    { type => 'RCBD' },
    { type => 'RRC' },
    { type => 'DRRC' },
    { type => 'URDD',      checks_list => $checks_list_id },
    { type => 'Alpha' },
    { type => 'Lattice' },
    { type => 'Augmented', checks_list => $checks_list_id },
    { type => 'MAD',       checks_list => $checks_list_id },
    { type => 'greenhouse' },
    {
        type       => 'splitplot',
        treatments => [
            { name => $treatment_names[0], value => 'High' },
            { name => $treatment_names[0], value => 'Low' },
        ],
    },
    {
        type             => 'Westcott',
        westcott_check_1 => $accessions[0],
        westcott_check_2 => $accessions[1],
    },
);

$t->while_logged_in_as("submitter", sub {
    for my $design (@designs) {
        my $type = $design->{type};

        my %overrides = %$design;
        delete $overrides{type};

        subtest $type => sub {
            # Each design gets a fresh page load (open_add_trial navigates),
            # so a failure here does not poison the designs that follow.
            my $trial_name = eval {
                create_trial($t,
                    %{ design_preset($type,
                        stock_list => $stock_list_id,
                        %overrides,
                    ) }
                );
            };

            if (my $err = $@) {
                $err =~ s/\s+at\s+\S+\s+line\s+\d+.*//s;
                fail("$type design failed: $err");
                return;
            }

            my $trial = find_trial($schema, $trial_name);
            ok($trial, "$type: trial '$trial_name' was saved to the database");
        };
    }
});

# Clean up the lists created for this test.
for my $list_id ($stock_list_id, $checks_list_id) {
    eval { CXGN::List::delete_list($dbh, $list_id); };
}

$t->driver->close();
done_testing();
