<?php
/**
 * Generates the demo gallery images for seeded properties.
 *
 * Why draw them instead of downloading photos: the seed has to be reproducible
 * offline and free of licensing questions, and a stock-photo service keyed by a
 * random seed returns whatever it likes — testing one returned the interior of
 * an abandoned car for a studio apartment. Drawing the images means every
 * listing always shows a building of the right kind, in a consistent style.
 *
 * Everything here is deterministic: the same slug and index always produce the
 * same image, so re-seeding never changes the demo.
 *
 * Included by seed.php; not meant to run on its own.
 */

/** Stable pseudo-random integer for a given string, so palettes never shift. */
function terra_img_hash( $text ) {
	return (int) hexdec( substr( md5( $text ), 0, 6 ) );
}

/**
 * Palette for one image: a sky pair, a building body, and a roof.
 * Index 2 uses a dusk sky so galleries do not look like the same shot repeated.
 */
function terra_img_palette( $slug, $index ) {
	$palettes = array(
		array( array( 174, 214, 241 ), array( 236, 247, 252 ) ), // clear day
		array( array( 155, 203, 235 ), array( 245, 240, 230 ) ), // soft morning
		array( array( 247, 178, 122 ), array( 253, 232, 201 ) ), // dusk
	);
	$sky = $palettes[ $index % 3 ];

	$bodies = array(
		array( 245, 243, 238 ),
		array( 232, 226, 214 ),
		array( 214, 219, 223 ),
		array( 226, 213, 200 ),
	);
	$roofs = array(
		array( 122, 96, 84 ),
		array( 92, 106, 116 ),
		array( 138, 108, 92 ),
		array( 78, 92, 84 ),
	);

	$pick = terra_img_hash( $slug );

	return array(
		'sky_top'    => $sky[0],
		'sky_bottom' => $sky[1],
		'body'       => $bodies[ $pick % count( $bodies ) ],
		'roof'       => $roofs[ ( $pick >> 3 ) % count( $roofs ) ],
	);
}

function terra_img_color( $im, array $rgb ) {
	return imagecolorallocate( $im, $rgb[0], $rgb[1], $rgb[2] );
}

/** Darken or lighten an rgb triplet by a factor, clamped to the byte range. */
function terra_img_shade( array $rgb, $factor ) {
	return array(
		max( 0, min( 255, (int) round( $rgb[0] * $factor ) ) ),
		max( 0, min( 255, (int) round( $rgb[1] * $factor ) ) ),
		max( 0, min( 255, (int) round( $rgb[2] * $factor ) ) ),
	);
}

/** Vertical gradient across the whole canvas. */
function terra_img_sky( $im, $w, $h, array $top, array $bottom ) {
	for ( $y = 0; $y < $h; $y++ ) {
		$t = $y / max( 1, $h - 1 );
		$c = imagecolorallocate(
			$im,
			(int) round( $top[0] + ( $bottom[0] - $top[0] ) * $t ),
			(int) round( $top[1] + ( $bottom[1] - $top[1] ) * $t ),
			(int) round( $top[2] + ( $bottom[2] - $top[2] ) * $t )
		);
		imageline( $im, 0, $y, $w, $y, $c );
	}
}

/** Grid of lit and unlit windows on a facade. */
function terra_img_windows( $im, $x, $y, $w, $h, $cols, $rows, $seed, $lit, $dark ) {
	$pad   = max( 6, (int) ( $w * 0.06 ) );
	$cellW = ( $w - $pad * ( $cols + 1 ) ) / $cols;
	$cellH = ( $h - $pad * ( $rows + 1 ) ) / $rows;

	for ( $r = 0; $r < $rows; $r++ ) {
		for ( $c = 0; $c < $cols; $c++ ) {
			$wx = (int) ( $x + $pad + $c * ( $cellW + $pad ) );
			$wy = (int) ( $y + $pad + $r * ( $cellH + $pad ) );
			$on = ( ( $seed >> ( ( $r * $cols + $c ) % 24 ) ) & 1 ) === 1;
			imagefilledrectangle( $im, $wx, $wy, (int) ( $wx + $cellW ), (int) ( $wy + $cellH ), $on ? $lit : $dark );
		}
	}
}

/**
 * Draw one property image and return the raw JPEG bytes.
 *
 * @param string $slug  Property slug, drives the palette.
 * @param string $type  house|apartment|land|commercial.
 * @param int    $index Image number within the gallery (0-based).
 */
function terra_img_render( $slug, $type, $index, $w = 1200, $h = 800 ) {
	$im  = imagecreatetruecolor( $w, $h );
	$pal = terra_img_palette( $slug, $index );
	$sd  = terra_img_hash( $slug . '-' . $index );

	terra_img_sky( $im, $w, $h, $pal['sky_top'], $pal['sky_bottom'] );

	$ground_y = (int) ( $h * 0.78 );
	$grass    = terra_img_color( $im, array( 141, 163, 122 ) );
	$grass_lo = terra_img_color( $im, array( 122, 145, 105 ) );
	imagefilledrectangle( $im, 0, $ground_y, $w, $h, $grass );
	imagefilledrectangle( $im, 0, (int) ( $h * 0.92 ), $w, $h, $grass_lo );

	$body     = terra_img_color( $im, $pal['body'] );
	$body_dk  = terra_img_color( $im, terra_img_shade( $pal['body'], 0.86 ) );
	$roof     = terra_img_color( $im, $pal['roof'] );
	$win_lit  = imagecolorallocate( $im, 252, 226, 168 );
	$win_dark = imagecolorallocate( $im, 96, 112, 124 );
	$trunk    = imagecolorallocate( $im, 104, 84, 68 );
	$leaves   = imagecolorallocate( $im, 108, 138, 96 );

	switch ( $type ) {
		case 'apartment':
			// A tall tower with a shorter wing beside it.
			$tw = (int) ( $w * 0.30 );
			$tx = (int) ( $w * 0.34 );
			$ty = (int) ( $h * 0.16 );
			imagefilledrectangle( $im, $tx, $ty, $tx + $tw, $ground_y, $body );
			terra_img_windows( $im, $tx, $ty, $tw, $ground_y - $ty, 4, 8, $sd, $win_lit, $win_dark );

			$sw = (int) ( $w * 0.18 );
			$sx = $tx + $tw + (int) ( $w * 0.03 );
			$sy = (int) ( $h * 0.42 );
			imagefilledrectangle( $im, $sx, $sy, $sx + $sw, $ground_y, $body_dk );
			terra_img_windows( $im, $sx, $sy, $sw, $ground_y - $sy, 3, 4, $sd >> 2, $win_lit, $win_dark );
			break;

		case 'commercial':
			// Wide low block with a glazed storefront band.
			$bx = (int) ( $w * 0.14 );
			$bw = (int) ( $w * 0.72 );
			$by = (int) ( $h * 0.34 );
			imagefilledrectangle( $im, $bx, $by, $bx + $bw, $ground_y, $body );
			imagefilledrectangle( $im, $bx, $by - (int) ( $h * 0.04 ), $bx + $bw, $by, $roof );
			terra_img_windows( $im, $bx, $by, $bw, (int) ( ( $ground_y - $by ) * 0.55 ), 6, 2, $sd, $win_lit, $win_dark );
			$gy = (int) ( $by + ( $ground_y - $by ) * 0.62 );
			imagefilledrectangle( $im, $bx + 20, $gy, $bx + $bw - 20, $ground_y - 10, $win_dark );
			break;

		case 'land':
			// No building: an open plot marked out with fence posts.
			$post = imagecolorallocate( $im, 158, 138, 112 );
			for ( $i = 0; $i < 9; $i++ ) {
				$px = (int) ( $w * 0.08 + $i * ( $w * 0.105 ) );
				$py = (int) ( $ground_y - $h * 0.10 + ( $i % 2 ) * 6 );
				imagefilledrectangle( $im, $px, $py, $px + 8, $ground_y + 10, $post );
				if ( $i > 0 ) {
					$prev = (int) ( $w * 0.08 + ( $i - 1 ) * ( $w * 0.105 ) );
					imagefilledrectangle( $im, $prev, $py + 14, $px, $py + 20, $post );
				}
			}
			for ( $i = 0; $i < 3; $i++ ) {
				$tx = (int) ( $w * ( 0.16 + 0.3 * $i ) );
				imagefilledrectangle( $im, $tx, (int) ( $ground_y - $h * 0.05 ), $tx + 10, $ground_y, $trunk );
				imagefilledellipse( $im, $tx + 5, (int) ( $ground_y - $h * 0.09 ), 70, 60, $leaves );
			}
			break;

		case 'house':
		default:
			// Pitched-roof house with a door, windows and a tree.
			$hw = (int) ( $w * 0.42 );
			$hx = (int) ( $w * 0.28 );
			$hy = (int) ( $h * 0.40 );
			imagefilledrectangle( $im, $hx, $hy, $hx + $hw, $ground_y, $body );
			imagefilledpolygon(
				$im,
				array( $hx - 30, $hy, $hx + $hw / 2, (int) ( $h * 0.22 ), $hx + $hw + 30, $hy ),
				$roof
			);
			terra_img_windows( $im, $hx, $hy + 20, $hw, (int) ( ( $ground_y - $hy ) * 0.45 ), 3, 1, $sd, $win_lit, $win_dark );
			$dw = (int) ( $hw * 0.16 );
			$dx = (int) ( $hx + $hw / 2 - $dw / 2 );
			imagefilledrectangle( $im, $dx, (int) ( $ground_y - $h * 0.16 ), $dx + $dw, $ground_y, $roof );
			$tx = (int) ( $w * 0.76 );
			imagefilledrectangle( $im, $tx, (int) ( $ground_y - $h * 0.10 ), $tx + 14, $ground_y, $trunk );
			imagefilledellipse( $im, $tx + 7, (int) ( $ground_y - $h * 0.17 ), 130, 120, $leaves );
			break;
	}

	ob_start();
	imagejpeg( $im, null, 82 );
	$bytes = ob_get_clean();
	imagedestroy( $im );

	return $bytes;
}

/* ---------------------------------------------------------------------
 * WordPress attachments
 * ------------------------------------------------------------------- */

/**
 * Create (or reuse) the gallery attachments for one property.
 *
 * Idempotent through the same `_terra_seed_key` convention the rest of the seed
 * uses, so re-running never duplicates media. The attachments are shared by the
 * EN and PT posts: it is the same building in both languages.
 *
 * @param string $slug  Property slug, drives the generated artwork.
 * @param string $title Property title, used for alt text.
 * @param string $type  house|apartment|land|commercial.
 * @param int    $count How many images to attach.
 * @return int[] Attachment IDs, in gallery order.
 */
function terra_img_attach_gallery( $slug, $title, $type, $count = 3 ) {
	require_once ABSPATH . 'wp-admin/includes/image.php';

	$views = array(
		'house'      => array( 'Exterior view', 'Front elevation', 'Garden side' ),
		'apartment'  => array( 'Building exterior', 'Street view', 'Evening view' ),
		'commercial' => array( 'Storefront', 'Street frontage', 'Side elevation' ),
		'land'       => array( 'Plot boundary', 'Frontage', 'Tree line' ),
	);
	$labels = $views[ $type ] ?? $views['house'];

	$ids = array();

	for ( $i = 0; $i < $count; $i++ ) {
		$seed_key = "image:{$slug}:{$i}";

		$existing = get_posts(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'any',
				'meta_key'       => '_terra_seed_key',
				'meta_value'     => $seed_key,
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);

		if ( $existing ) {
			$ids[] = (int) $existing[0];
			continue;
		}

		$bytes  = terra_img_render( $slug, $type, $i );
		$upload = wp_upload_bits( "{$slug}-{$i}.jpg", null, $bytes );

		if ( ! empty( $upload['error'] ) ) {
			Terra_Seed_Output::warning( "Could not write image for {$slug} #{$i}: {$upload['error']}" );
			continue;
		}

		$label = $labels[ $i % count( $labels ) ];

		$id = wp_insert_attachment(
			array(
				'post_mime_type' => 'image/jpeg',
				'post_title'     => "{$title} — {$label}",
				'post_status'    => 'inherit',
			),
			$upload['file'],
			0,
			true
		);

		if ( is_wp_error( $id ) ) {
			Terra_Seed_Output::warning( "Could not attach image for {$slug} #{$i}: " . $id->get_error_message() );
			continue;
		}

		wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );
		update_post_meta( $id, '_wp_attachment_image_alt', "{$label} of {$title}" );
		update_post_meta( $id, '_terra_seed_key', $seed_key );

		$ids[] = (int) $id;
	}

	return $ids;
}
