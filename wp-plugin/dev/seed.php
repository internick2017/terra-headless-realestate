<?php
/**
 * Seeds bilingual (EN/PT) demo content for Terra: property listings and neighborhood
 * articles, linked as Polylang translations.
 *
 * Two ways in, running the same code either way:
 *   - WP-CLI, from wp-plugin/dev:
 *       docker compose exec -T wpcli wp --allow-root eval-file
 *         /var/www/html/wp-content/plugins/terra-realestate/dev/seed.php
 *   - Tools -> Terra demo content in wp-admin, for a host with no shell.
 *
 * The second exists because shared hosting is where a demo like this ends up, and it
 * does not give you WP-CLI. Output goes through Terra_Seed_Output, which prints to the
 * terminal or collects for the admin page depending on where it is running.
 *
 * Declarative rather than write-once: every post and term carries a `_terra_seed_key`
 * meta value, so nothing is ever duplicated, but the fields hanging off a post are
 * re-applied on every run. Editing this file and re-running reconciles the database
 * with it.
 *
 * Polylang free ships no WP-CLI commands, so language and translation-linking are done
 * through Polylang's own PHP API (the same functions the admin UI calls), not `wp pll`.
 */

if ( ! defined( 'ABSPATH' ) ) {
	echo "This script runs inside WordPress: through WP-CLI, or from Tools -> Terra demo content.";
	exit( 1 );
}

require_once __DIR__ . '/../includes/class-seed-output.php';

// Gallery artwork is drawn locally rather than downloaded; see images.php.
require_once __DIR__ . '/images.php';

/*
 * Terra is a fictional town, but its coordinates are not arbitrary: they sit in
 * Francisco Beltrao, Parana, so the map on a listing agrees with its Portuguese
 * address instead of dropping a pin in New Jersey, which is where the first
 * pass of this seed put them. Two clusters, matching the two neighborhoods:
 * Centro on the town centre, Beira-Rio along the Marrecas.
 */

/* ---------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------- */

/**
 * Find a previously seeded post by its seed key, regardless of status.
 */
function terra_seed_find_by_key( $seed_key, $post_type ) {
	$existing = get_posts(
		array(
			'post_type'      => $post_type,
			'post_status'    => 'any',
			'meta_key'       => '_terra_seed_key',
			'meta_value'     => $seed_key,
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	return $existing ? (int) $existing[0] : 0;
}

/**
 * Write every ACF field of a property onto its two language posts.
 *
 * Called for new and existing posts alike, which is what makes the seed
 * declarative: this file is the source of truth, and a re-run reconciles the
 * database with it rather than only filling in what is missing.
 */
function terra_seed_apply_property_fields( $en_id, $pt_id, $p ) {
	$fields = $p['fields'];

	// One set of images per property, shared by both languages: it is the same
	// building whichever language you read about it in.
	$gallery_ids = terra_img_attach_gallery( $p['seed_key'], $p['en']['title'], $fields['propertyType'] );

	// Fields shared between the EN and PT posts (price, specs, agent, coordinates, ...).
	foreach ( array( $en_id, $pt_id ) as $post_id ) {
		update_field( 'price', $fields['price'], $post_id );
		update_field( 'currency', $fields['currency'], $post_id );
		update_field( 'operation', $fields['operation'], $post_id );
		update_field( 'propertyType', $fields['propertyType'], $post_id );
		update_field( 'bedrooms', $fields['bedrooms'], $post_id );
		update_field( 'bathrooms', $fields['bathrooms'], $post_id );
		update_field( 'areaM2', $fields['areaM2'], $post_id );
		update_field( 'latitude', $fields['latitude'], $post_id );
		update_field( 'longitude', $fields['longitude'], $post_id );
		update_field( 'status', $fields['status'], $post_id );
		update_field( 'agentName', $fields['agentName'], $post_id );
		update_field( 'agentEmail', $fields['agentEmail'], $post_id );
		update_field( 'gallery', $gallery_ids, $post_id );
	}

	// Language-specific text fields.
	update_field( 'address', $fields['address']['en'], $en_id );
	update_field( 'address', $fields['address']['pt'], $pt_id );
	update_field( 'neighborhoodName', $fields['neighborhoodName']['en'], $en_id );
	update_field( 'neighborhoodName', $fields['neighborhoodName']['pt'], $pt_id );
}

/**
 * Insert a post, tag it with a seed key, and set its Polylang language.
 */
function terra_seed_insert_post( $seed_key, $post_type, $title, $content, $lang ) {
	$id = wp_insert_post(
		array(
			'post_type'    => $post_type,
			'post_status'  => 'publish',
			'post_title'   => $title,
			'post_content' => $content,
		),
		true
	);

	if ( is_wp_error( $id ) ) {
		Terra_Seed_Output::error( "Failed to insert post '{$title}': " . $id->get_error_message() );
	}

	update_post_meta( $id, '_terra_seed_key', $seed_key );

	if ( function_exists( 'pll_set_post_language' ) ) {
		pll_set_post_language( $id, $lang );
	} else {
		PLL()->model->post->set_language( $id, $lang );
	}

	return (int) $id;
}

/**
 * Link two posts as EN/PT translations of each other.
 */
function terra_seed_link_post_translations( $en_id, $pt_id ) {
	$translations = array(
		'en' => $en_id,
		'pt' => $pt_id,
	);
	if ( function_exists( 'pll_save_post_translations' ) ) {
		pll_save_post_translations( $translations );
	} else {
		PLL()->model->post->save_translations( $translations );
	}
}

/**
 * Find or create a translated category term for the given seed key.
 */
function terra_seed_category( $seed_key, $name, $lang ) {
	$existing = get_terms(
		array(
			'taxonomy'   => 'category',
			'hide_empty' => false,
			'meta_key'   => '_terra_seed_key',
			'meta_value' => $seed_key,
			'fields'     => 'ids',
		)
	);
	if ( ! empty( $existing ) ) {
		return (int) $existing[0];
	}

	$term = wp_insert_term( $name, 'category' );
	if ( is_wp_error( $term ) ) {
		Terra_Seed_Output::error( "Failed to insert category '{$name}': " . $term->get_error_message() );
	}
	$term_id = (int) $term['term_id'];
	update_term_meta( $term_id, '_terra_seed_key', $seed_key );

	if ( function_exists( 'pll_set_term_language' ) ) {
		pll_set_term_language( $term_id, $lang );
	} else {
		PLL()->model->term->set_language( $term_id, $lang );
	}

	return $term_id;
}

/* ---------------------------------------------------------------------
 * Neighborhoods category (category is a Polylang-translated taxonomy,
 * so EN and PT each get their own term, linked as translations).
 * ------------------------------------------------------------------- */

$cat_en = terra_seed_category( 'cat-neighborhoods-en', 'Neighborhoods', 'en' );
$cat_pt = terra_seed_category( 'cat-neighborhoods-pt', 'Bairros', 'pt' );

if ( function_exists( 'pll_save_term_translations' ) ) {
	pll_save_term_translations(
		array(
			'en' => $cat_en,
			'pt' => $cat_pt,
		)
	);
} else {
	PLL()->model->term->save_translations(
		array(
			'en' => $cat_en,
			'pt' => $cat_pt,
		)
	);
}

/* ---------------------------------------------------------------------
 * Properties
 * ------------------------------------------------------------------- */

$properties = array(
	array(
		'seed_key' => 'downtown-loft',
		'en'       => array(
			'title'       => 'Downtown Loft',
			'description' => "A bright industrial-style loft in the heart of Downtown, steps from cafes, public transit, and nightlife. Open floor plan with tall ceilings, exposed brick, and large windows that fill the space with natural light.",
		),
		'pt'       => array(
			'title'       => 'Loft no Centro',
			'description' => "Um loft industrial e iluminado no coração do Centro, a poucos passos de cafés, transporte público e vida noturna. Planta aberta com pé-direito alto, tijolo aparente e janelas grandes que preenchem o espaço com luz natural.",
		),
		'fields'   => array(
			'price'            => 320000,
			'currency'         => 'USD',
			'operation'        => 'sale',
			'propertyType'     => 'apartment',
			'bedrooms'         => 1,
			'bathrooms'        => 1,
			'areaM2'           => 68,
			'address'          => array(
				'en' => '120 Main Street, Unit 4B',
				'pt' => 'Rua Principal 120, Unidade 4B',
			),
			'neighborhoodName' => array(
				'en' => 'Downtown',
				'pt' => 'Centro',
			),
			'latitude'         => -26.0783,
			'longitude'        => -53.0552,
			'status'           => 'available',
			'agentName'        => 'Maria Silva',
			'agentEmail'       => 'maria.silva@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'riverside-cottage',
		'en'       => array(
			'title'       => 'Riverside Cottage',
			'description' => "A cozy three-bedroom cottage tucked along the riverbank, with a private garden, a covered porch, and quick access to the walking trail. Ideal for a quiet family home close to the water.",
		),
		'pt'       => array(
			'title'       => 'Casa na Beira-Rio',
			'description' => "Uma aconchegante casa de três quartos junto à margem do rio, com jardim privativo, varanda coberta e acesso rápido à trilha para caminhada. Ideal para uma família que busca tranquilidade perto da água.",
		),
		'fields'   => array(
			'price'            => 275000,
			'currency'         => 'USD',
			'operation'        => 'sale',
			'propertyType'     => 'house',
			'bedrooms'         => 3,
			'bathrooms'        => 2,
			'areaM2'           => 140,
			'address'          => array(
				'en' => '45 River Road',
				'pt' => 'Estrada do Rio 45',
			),
			'neighborhoodName' => array(
				'en' => 'Riverside',
				'pt' => 'Beira-Rio',
			),
			'latitude'         => -26.0672,
			'longitude'        => -53.0431,
			'status'           => 'available',
			'agentName'        => 'Carlos Mendes',
			'agentEmail'       => 'carlos.mendes@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'downtown-family-house',
		'en'       => array(
			'title'       => 'Downtown Family House',
			'description' => "A spacious four-bedroom family house two blocks from Downtown's main square, with a fenced backyard, a two-car garage, and a renovated kitchen.",
		),
		'pt'       => array(
			'title'       => 'Casa de Familia no Centro',
			'description' => "Uma espaçosa casa de família com quatro quartos, a duas quadras da praça principal do Centro, com quintal cercado, garagem para dois carros e cozinha reformada.",
		),
		'fields'   => array(
			'price'            => 1250000,
			'currency'         => 'BRL',
			'operation'        => 'sale',
			'propertyType'     => 'house',
			'bedrooms'         => 4,
			'bathrooms'        => 3,
			'areaM2'           => 220,
			'address'          => array(
				'en' => '78 Oak Avenue',
				'pt' => 'Avenida dos Carvalhos 78',
			),
			'neighborhoodName' => array(
				'en' => 'Downtown',
				'pt' => 'Centro',
			),
			'latitude'         => -26.0801,
			'longitude'        => -53.0563,
			'status'           => 'available',
			'agentName'        => 'Maria Silva',
			'agentEmail'       => 'maria.silva@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'downtown-studio',
		'en'       => array(
			'title'       => 'Downtown Studio',
			'description' => "A compact, modern studio for rent right in Downtown, fully furnished and ready to move in. Walking distance to offices, restaurants, and the metro station.",
		),
		'pt'       => array(
			'title'       => 'Studio no Centro',
			'description' => "Um studio moderno e compacto para alugar bem no Centro, totalmente mobiliado e pronto para morar. A poucos passos de escritórios, restaurantes e da estação de metrô.",
		),
		'fields'   => array(
			'price'            => 1200,
			'currency'         => 'USD',
			'operation'        => 'rent',
			'propertyType'     => 'apartment',
			'bedrooms'         => 0,
			'bathrooms'        => 1,
			'areaM2'           => 35,
			'address'          => array(
				'en' => '12 Market Street, Unit 9',
				'pt' => 'Rua do Mercado 12, Unidade 9',
			),
			'neighborhoodName' => array(
				'en' => 'Downtown',
				'pt' => 'Centro',
			),
			'latitude'         => -26.0790,
			'longitude'        => -53.0541,
			'status'           => 'available',
			'agentName'        => 'Ana Costa',
			'agentEmail'       => 'ana.costa@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'riverside-villa',
		'en'       => array(
			'title'       => 'Riverside Villa',
			'description' => "An expansive five-bedroom villa with direct river views, a private pool, and a large outdoor terrace built for entertaining. Currently reserved, with a similar unit expected soon.",
		),
		'pt'       => array(
			'title'       => 'Vila na Beira-Rio',
			'description' => "Uma ampla vila de cinco quartos com vista direta para o rio, piscina privativa e um grande terraço externo pensado para receber convidados. Atualmente reservada, com uma unidade semelhante prevista em breve.",
		),
		'fields'   => array(
			'price'            => 650000,
			'currency'         => 'USD',
			'operation'        => 'sale',
			'propertyType'     => 'house',
			'bedrooms'         => 5,
			'bathrooms'        => 4,
			'areaM2'           => 380,
			'address'          => array(
				'en' => '8 Riverside Drive',
				'pt' => 'Alameda Beira-Rio 8',
			),
			'neighborhoodName' => array(
				'en' => 'Riverside',
				'pt' => 'Beira-Rio',
			),
			'latitude'         => -26.0684,
			'longitude'        => -53.0447,
			'status'           => 'reserved',
			'agentName'        => 'Carlos Mendes',
			'agentEmail'       => 'carlos.mendes@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'downtown-commercial-space',
		'en'       => array(
			'title'       => 'Downtown Commercial Space',
			'description' => "A ground-floor commercial space for rent on Downtown's busiest street, with large storefront windows, a private restroom, and a small storage room in the back.",
		),
		'pt'       => array(
			'title'       => 'Espaço Comercial no Centro',
			'description' => "Um espaço comercial no térreo, para alugar na rua mais movimentada do Centro, com grandes vitrines, banheiro privativo e um pequeno depósito nos fundos.",
		),
		'fields'   => array(
			'price'            => 3000,
			'currency'         => 'USD',
			'operation'        => 'rent',
			'propertyType'     => 'commercial',
			'bedrooms'         => 0,
			'bathrooms'        => 2,
			'areaM2'           => 150,
			'address'          => array(
				'en' => '200 Commerce Street',
				'pt' => 'Rua do Comércio 200',
			),
			'neighborhoodName' => array(
				'en' => 'Downtown',
				'pt' => 'Centro',
			),
			'latitude'         => -26.0796,
			'longitude'        => -53.0549,
			'status'           => 'available',
			'agentName'        => 'Ana Costa',
			'agentEmail'       => 'ana.costa@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'riverside-view-apartment',
		'en'       => array(
			'title'       => 'Riverside View Apartment',
			'description' => "A two-bedroom apartment on the top floor of a riverside building, with a balcony overlooking the water and access to a shared rooftop deck.",
		),
		'pt'       => array(
			'title'       => 'Apartamento com Vista para o Rio',
			'description' => "Um apartamento de dois quartos no último andar de um edifício à beira-rio, com varanda voltada para a água e acesso a um deck compartilhado na cobertura.",
		),
		'fields'   => array(
			'price'            => 890000,
			'currency'         => 'BRL',
			'operation'        => 'sale',
			'propertyType'     => 'apartment',
			'bedrooms'         => 2,
			'bathrooms'        => 2,
			'areaM2'           => 95,
			'address'          => array(
				'en' => '22 Riverside Drive, Floor 8',
				'pt' => 'Alameda Beira-Rio 22, 8º Andar',
			),
			'neighborhoodName' => array(
				'en' => 'Riverside',
				'pt' => 'Beira-Rio',
			),
			'latitude'         => -26.0677,
			'longitude'        => -53.0438,
			'status'           => 'available',
			'agentName'        => 'Carlos Mendes',
			'agentEmail'       => 'carlos.mendes@terrahomes.example',
		),
	),
	array(
		'seed_key' => 'riverside-land-lot',
		'en'       => array(
			'title'       => 'Riverside Land Lot',
			'description' => "A large riverside land lot ready for construction, with utilities available at the street and flat, clear terrain. Recently sold, kept here for reference.",
		),
		'pt'       => array(
			'title'       => 'Lote na Beira-Rio',
			'description' => "Um grande lote de terreno à beira-rio, pronto para construção, com infraestrutura disponível na rua e terreno plano e limpo. Vendido recentemente, mantido aqui como referência.",
		),
		'fields'   => array(
			'price'            => 320000,
			'currency'         => 'BRL',
			'operation'        => 'sale',
			'propertyType'     => 'land',
			'bedrooms'         => 0,
			'bathrooms'        => 0,
			'areaM2'           => 5000,
			'address'          => array(
				'en' => 'Lot 14, Riverside Road',
				'pt' => 'Lote 14, Estrada Beira-Rio',
			),
			'neighborhoodName' => array(
				'en' => 'Riverside',
				'pt' => 'Beira-Rio',
			),
			'latitude'         => -26.0689,
			'longitude'        => -53.0455,
			'status'           => 'sold',
			'agentName'        => 'Ana Costa',
			'agentEmail'       => 'ana.costa@terrahomes.example',
		),
	),
);

$seeded_properties  = 0;
$skipped_properties = 0;

foreach ( $properties as $p ) {
	$en_key = $p['seed_key'] . '-en';
	$pt_key = $p['seed_key'] . '-pt';

	$existing_en = terra_seed_find_by_key( $en_key, 'property' );
	$existing_pt = terra_seed_find_by_key( $pt_key, 'property' );

	$already_seeded = $existing_en && $existing_pt;

	if ( $already_seeded ) {
		$en_id = $existing_en;
		$pt_id = $existing_pt;
	} else {
		$en_id = terra_seed_insert_post( $en_key, 'property', $p['en']['title'], $p['en']['description'], 'en' );
		$pt_id = terra_seed_insert_post( $pt_key, 'property', $p['pt']['title'], $p['pt']['description'], 'pt' );

		terra_seed_link_post_translations( $en_id, $pt_id );
	}

	// The fields are re-applied whether or not the post is new. Skipping them
	// was how the coordinates in this file stayed months out of date in an
	// already-seeded environment: the values here changed and nothing read
	// them again. Only the post itself is created once; everything hanging off
	// it is declared, so a re-run makes the database match this file.
	terra_seed_apply_property_fields( $en_id, $pt_id, $p );

	if ( $already_seeded ) {
		Terra_Seed_Output::log( "Refreshed property '{$p['en']['title']}' (EN #{$en_id} / PT #{$pt_id})" );
		$skipped_properties++;
	} else {
		Terra_Seed_Output::log( "Seeded property '{$p['en']['title']}' -> EN #{$en_id} / PT #{$pt_id}" );
		$seeded_properties++;
	}
}

/* ---------------------------------------------------------------------
 * Neighborhood articles
 * ------------------------------------------------------------------- */

$neighborhoods = array(
	array(
		'seed_key' => 'neighborhood-downtown',
		'en'       => array(
			'title'   => 'Downtown',
			'content' => "<p>Downtown is Terra's most walkable neighborhood, built around a central square lined with cafes, shops, and a weekly farmers market.</p><p>Residents are a short walk from public transit, coworking spaces, and some of the city's best restaurants. Housing ranges from modern studios to family houses just a few blocks from the square.</p><p>It suits people who want city life close at hand: quick commutes, easy errands, and plenty to do after work.</p>",
		),
		'pt'       => array(
			'title'   => 'Centro',
			'content' => "<p>O Centro é o bairro mais fácil de percorrer a pé em Terra, construído ao redor de uma praça central cercada por cafés, lojas e uma feira semanal de produtores.</p><p>Os moradores ficam a poucos passos do transporte público, de espaços de coworking e de alguns dos melhores restaurantes da cidade. As opções de moradia vão de studios modernos a casas de família a poucas quadras da praça.</p><p>É ideal para quem busca a vida urbana por perto: deslocamentos rápidos, tarefas do dia a dia facilitadas e muita coisa para fazer depois do trabalho.</p>",
		),
	),
	array(
		'seed_key' => 'neighborhood-riverside',
		'en'       => array(
			'title'   => 'Riverside',
			'content' => "<p>Riverside runs along the water on the east side of town, known for its walking trail, quiet streets, and views that change with the seasons.</p><p>The neighborhood mixes cottages, family houses, and a few newer apartment buildings with river views. A short bike ride connects Riverside to Downtown for anyone who wants both quiet evenings and easy access to the center.</p><p>It suits families and anyone who wants more outdoor space without leaving the city behind.</p>",
		),
		'pt'       => array(
			'title'   => 'Beira-Rio',
			'content' => "<p>Beira-Rio acompanha o curso do rio na parte leste da cidade, conhecido pela trilha para caminhada, ruas tranquilas e vistas que mudam com as estações.</p><p>O bairro combina casas de campo, residências familiares e alguns prédios de apartamentos mais novos com vista para o rio. Um curto passeio de bicicleta liga o Beira-Rio ao Centro, para quem busca noites tranquilas sem abrir mão do acesso fácil ao centro da cidade.</p><p>É ideal para famílias e para quem quer mais espaço ao ar livre sem deixar a cidade para trás.</p>",
		),
	),
);

$seeded_neighborhoods  = 0;
$skipped_neighborhoods = 0;

foreach ( $neighborhoods as $n ) {
	$en_key = $n['seed_key'] . '-en';
	$pt_key = $n['seed_key'] . '-pt';

	$existing_en = terra_seed_find_by_key( $en_key, 'post' );
	$existing_pt = terra_seed_find_by_key( $pt_key, 'post' );

	if ( $existing_en && $existing_pt ) {
		Terra_Seed_Output::log( "Skipping neighborhood '{$n['en']['title']}' (already seeded: EN #{$existing_en}, PT #{$existing_pt})" );
		$skipped_neighborhoods++;
		continue;
	}

	$en_id = terra_seed_insert_post( $en_key, 'post', $n['en']['title'], $n['en']['content'], 'en' );
	$pt_id = terra_seed_insert_post( $pt_key, 'post', $n['pt']['title'], $n['pt']['content'], 'pt' );

	terra_seed_link_post_translations( $en_id, $pt_id );

	wp_set_post_categories( $en_id, array( $cat_en ) );
	wp_set_post_categories( $pt_id, array( $cat_pt ) );

	Terra_Seed_Output::log( "Seeded neighborhood '{$n['en']['title']}' -> EN #{$en_id} / PT #{$pt_id}" );
	$seeded_neighborhoods++;
}

Terra_Seed_Output::success(
	sprintf(
		'Seeded %d properties (EN+PT) and %d neighborhoods (EN+PT). Skipped %d properties and %d neighborhoods already seeded.',
		$seeded_properties,
		$seeded_neighborhoods,
		$skipped_properties,
		$skipped_neighborhoods
	)
);
