package CXGN::List::Transform::Plugin::TraitIds2OrderName;

use Moose;
use CXGN::List::Transform;

sub name {
    return "trait_ids_2_order_name";
}

sub display_name {
    return "Trait IDs to order name";
}

sub can_transform {
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "trait_ids") and ($type2 eq "order_name")) {
        return 1;
    } else {
        return 0;
    }
}


sub transform {
    my $self = shift;
    my $schema = shift;
    my $list = shift;

    my $t = CXGN::List::Transform->new();
    return $t->transform($schema, 'trait_ids_2_order', $list, 'name');
}


1;
