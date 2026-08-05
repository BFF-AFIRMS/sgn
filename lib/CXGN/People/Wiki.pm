
package CXGN::People::Wiki;

use Moose;

use Data::Dumper;
use CXGN::People::Schema;

has people_schema => (isa => 'Ref', is => 'rw');

has page_name => ( isa => 'Str',
		    is => 'rw');

has page_content => ( isa => 'Str',
		      is => 'rw');

has page_version => ( isa => 'Maybe[Int]',
		      is => 'rw');

has sp_person_id => ( isa => 'Int',
		      is => 'rw');

has sp_wiki_id => (isa => 'Int',
		   is => 'rw');

has create_date => (isa => 'Str',
		    is => 'rw');


sub BUILD {
    my $self = shift;

    my $row = $self->people_schema()->resultset("SpWiki")->find( { page_name => $self->page_name } );

    if ($row) {
	$self->sp_person_id($row->sp_person_id());
	$self->create_date($row->create_date());
	$self->sp_wiki_id($row->sp_wiki_id());
	$self->page_version($self->get_version());
    }

}


sub new_page {
    my $self = shift;
    my $page_name = shift || $self->page_name();
    my $sp_person_id = shift || $self->sp_person_id();

    my $row = $self->people_schema()->resultset("SpWiki")->find( { page_name => $page_name } );

    if ($row) {
	die "Page named $page_name already exists!\n";
    }
    elsif (! $sp_person_id) {
	die "The sp_person_id parameter is required!";
    }
    else {
	my $new_data = {
	    page_name => $page_name,
	    sp_person_id => $sp_person_id,

	};

	my $new_row = $self->people_schema()->resultset("SpWiki")->create($new_data);

	return $new_row->sp_wiki_id();

    }

}

sub rename_page {
    my $self = shift;
    my $old_page_name = shift;
    my $new_page_name = shift;

    my $old_page_rs = $self->people_schema()->resultset("SpWiki")->find( { page_name => $old_page_name } );
    my $new_page_rs = $self->people_schema()->resultset("SpWiki")->find( { page_name => $new_page_name } );

    if (! $old_page_rs) {
	    die "Page named $old_page_name does not exist!\n";
    }
    if ($new_page_rs) {
	    die "Page named $old_page_name already exists!\n";
    }

    $old_page_rs->update({page_name => $new_page_name});
	return $old_page_rs->sp_wiki_id();
}

sub retrieve_page {
    my $self = shift;
    my $page_name = shift;

    print STDERR "RETRIEVING WIKI PAGE NAMED $page_name\n";

    my $row = $self->people_schema()->resultset("SpWiki")->find( { page_name => $page_name });

    # if (! $row && ($page_name eq "" || $page_name eq "WikiHome" )) {

    # 	print STDERR "NO PAGE EXISTS... RETURNING GREETING\n";
    # 	return {
    # 	    page_content => "WELCOME TO THE WIKI!",
    # 	    page_version => 0,
    # 	};

    # }

    if (! $row) {
	print STDERR "PAGE DOES NOT EXIST!\n";
	die "The page with name $page_name does not exist!";
    }

    else {
	my $sp_wiki_id = $row->sp_wiki_id();

	print STDERR "RETRIEVING PAGE $page_name WITH sp_wiki_id $sp_wiki_id\n";
	my $content_rs = $self->people_schema()->resultset("SpWikiContent")->search( { sp_wiki_id => $sp_wiki_id }, { order_by => { -desc => 'page_version' } } );

	my $content_row;
	if ($content_rs->count() > 0) {
	    $content_row = $content_rs->next();

	    $self->page_name($page_name);
	    $self->page_version($content_row->page_version());
	    $self->page_content($content_row->page_content());
	    $self->sp_person_id($row->sp_person_id());

	    return {
		page_content => $content_row->page_content(),
		page_version => $content_row->page_version(),
		sp_person_id => $row->sp_person_id(),
	    };
	}

	else {
	    return;
	}
    }

}


sub store_page {
    my $self = shift;
    my $page_name = shift || $self->page_name() || 'WikiHome';
    my $content = shift || $self->page_content();
    my $sp_person_id = shift || $self->sp_person_id();

    print STDERR "STORE_PAGE: $page_name, $content\n";

    my $row = $self->people_schema()->resultset("SpWiki")->find( { page_name => $page_name });

    # if (! $row && $page_name eq 'WikiHome') {
    # 	$row = $self->people_schema()->resultset("SpWiki")->create(
    # 	    {
    # 		sp_person_id => $sp_person_id,
    # 		page_name => "WikiHome",
    # 	    });

    # 	$row->insert();

    # }
    if (! $row) {
	print STDERR "THE WIKI PAGE DOES NOT EXIST ($page_name)\n";
 	die "The page with page name $page_name does not exist!";
    }

    my $sp_wiki_id = $row->sp_wiki_id();

    # figure out previous version, if any
    #
    my $current_version = 0;

    my $previous_content_rs = $self->people_schema()->resultset("SpWikiContent")->search( { sp_wiki_id => $sp_wiki_id }, { order_by => { -desc => 'page_version' } } );

    my $previous_content_row;

    print STDERR "FINDING CURRENT VERSION...\n";

    if ($previous_content_rs->count() > 0) {
	print STDERR "WE HAVE PREVIOUS DATA...\n";
	$previous_content_row = $previous_content_rs->next();
	if ($previous_content_row->page_content() eq $content) {
	    return { error => "The new content is identical to the content of the page already exists!" };
	}

	if ($previous_content_row) {
	    print STDERR "WE HAVE A ROW...\n";
	    $current_version = $previous_content_row->page_version();
	}
    }

    print STDERR "CURRENT VERSION: $current_version\n";

    my $new_version = $current_version + 1;

    print STDERR "NEW VERSION : $new_version\n";
    my $wiki_content = {
	page_content => $content,
	page_version => $new_version,
	sp_wiki_id   => $sp_wiki_id,
    };

    my $new_row;
    eval {
	print STDERR "STORING PAGE DATA... $content\n";
	$new_row = $self->people_schema()->resultset("SpWikiContent")->create($wiki_content);
	$new_row->insert();
    };
    if ($@) {
	print STDERR "An error occurred storing content. $@\n";
	return { error => $@ };
    }

    $self->page_content($content);
    $self->page_version($new_version);

    return {
	page_version => $new_row->page_version(),
	wiki_content_id => $new_row->sp_wiki_content_id()
    };
}

sub delete {
    my $self = shift;
    my $page_name = shift || $self->page_name();

    print STDERR "DELETING PAGE $page_name\n";

    my $row = $self->people_schema()->resultset("SpWiki")->find( { page_name => $page_name });

    $row->delete();
}


sub get_version {
    my $self =shift;
    my $page_name = shift || $self->page_name();

    my $row = $self->people_schema()->resultset("SpWiki")->find( { page_name => $page_name });

    my $page_version;

    if (! $row) {
	return 0;
    }

    my $version_rs = $self->people_schema()->resultset("SpWikiContent")->search( { sp_wiki_id => $row->sp_wiki_id() }, { order_by => { -desc => 'page_version' } } );

    if ($version_rs->count() > 0) {
	my $version_row = $version_rs->next();
	$page_version = $version_row->page_version();
    }

    return $page_version;
}


sub all_pages {
    my $self = shift;

    my $rs = $self->people_schema()->resultset("SpWiki")->search();

    my @pages;
    while (my $row = $rs->next()) {
	push @pages, $row->page_name();
    }

    @pages = sort(@pages);

    print STDERR "PAGES ".Dumper(\@pages);
    return @pages;
}


sub scrub_page {
    my $self = shift;
    my $content = shift;

    my @rules = (
        script => 0,
        img    => {
            src => qr{^(?!http://)}i,    # only relative image links allowed
            alt => 1,                    # alt attribute allowed
            '*' => 0,                    # deny all other attributes
        },
    );

    my @default = (
        1 =>                                   # default rule, allow all tags
            {
            '*'    => 1,                       # default rule, allow all attributes
            'href' => qr{^(?:http|https|ftp)://}i,
            'src'  => qr{^(?:http|https|ftp)://}i,

            #   If your perl doesn't have qr
            #   just use a string with length greater than 1
            'cite'        => '(?i-xsm:^(?:http|https|ftp):)',
            'language'    => 0,
            'name'        => 0,                # disable this one too
            'onblur'      => 0,
            'onchange'    => 0,
            'onclick'     => 0,
            'ondblclick'  => 0,
            'onerror'     => 0,
            'onfocus'     => 0,
            'onkeydown'   => 0,
            'onkeypress'  => 0,
            'onkeyup'     => 0,
            'onload'      => 0,
            'onmousedown' => 0,
            'onmousemove' => 0,
            'onmouseout'  => 0,
            'onmouseover' => 0,
            'onmouseup'   => 0,
            'onreset'     => 0,
            'onselect'    => 0,
            'onsubmit'    => 0,
            'onunload'    => 0,
            'src'         => 0,
            'type'        => 0,
            }
    );

    my $scrubber = HTML::Scrubber->new(
        rules   => \@rules,
        default => \@default,
        comment => 1,
        process => 0,
    );

    return $scrubber->scrub($content);
}

1;
