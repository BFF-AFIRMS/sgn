use lib 't/lib';
use strict;
use Test::More;
use SGN::Test::WWW::WebDriver;
use SGN::Test::Fixture;

my $t = SGN::Test::WWW::WebDriver->new();
my $f = SGN::Test::Fixture->new();

my $schema = $f->bcs_schema;

$t->while_logged_in_as("curator", sub {

    my $plot_1 = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => 'CASS_6Genotypes_107' });
    $plot_1->create_stockprops({ 'is a control' => 1, 'stock_additional_info' => '{"is_a_control": 1}'});

    my $plot_2 = $f->bcs_schema->resultset('Stock::Stock')->find({ uniquename => 'CASS_6Genotypes_106' });
    $plot_2->create_stockprops({ 'is a control' => 1, 'stock_additional_info' => '{"is_a_control": 0}'});

    print STDERR "\n\nsleeping\n\n";
    sleep(300);
});

$t->driver->quit();
$f->clean_up_db();
done_testing();
