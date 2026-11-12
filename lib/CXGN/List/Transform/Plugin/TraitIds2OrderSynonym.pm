package CXGN::List::Transform::Plugin::TraitIds2OrderSynonym;

use Moose;
use CXGN::List::Transform;

sub name {
    return "trait_ids_2_order_synonym";
}

sub display_name {
    return "Trait IDs to order synonym";
}

sub can_transform {
    my $self = shift;
    my $type1 = shift;
    my $type2 = shift;

    if (($type1 eq "trait_ids") and ($type2 eq "order_synonym")) {
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
    return $t->transform($schema, 'trait_ids_2_order', $list, 'synonym');
}


1;
