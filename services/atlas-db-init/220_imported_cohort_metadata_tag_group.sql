-- Tag groups for cohorts imported from external libraries.
--
-- WebAPI cannot create a root tag through its API: POST /tag rejects an empty
-- groups list with "A tag must be assigned to at least one tag group", and
-- omitting the field fails conversion outright. Every tag must point at a group
-- that already exists, so the groups have to be seeded here -- the same way this
-- directory seeds roles and permissions.
--
-- Two groups, because the tags they hold have opposite cardinality:
--
--   Imported Cohort Metadata  multi_selection = true   -> 'Phenotype Library'
--       Source of the cohort. A cohort may carry this alongside other tags, so
--       the group must allow multiple selections.
--
--   Cohort Review Status      multi_selection = false  -> 'Accepted', 'Pending', ...
--       Review state. Exactly one applies at a time, and AbstractDaoService
--       .assignTag unassigns every other tag in a single-selection group when a
--       new one is assigned. That is what retires the previous status when a
--       cohort is re-imported after the library changes it -- no bookkeeping
--       needed on our side.
--
-- Both groups need allow_custom: TagService.create refuses to attach a tag to a
-- group without it ("Tag can be added only to groups that allows to do it").
-- Neither is ever assigned to a cohort, so both stay hidden (show_group = false).
-- type 0 = TagType.SYSTEM, i.e. platform-provisioned.
DO $$
DECLARE
    source_group_id integer;
    status_group_id integer;
BEGIN
    -- Group holding the source/provenance tag.
    SELECT id INTO source_group_id FROM webapi.tag
    WHERE lower(name) = lower('Imported Cohort Metadata');

    IF source_group_id IS NULL THEN
        INSERT INTO webapi.tag (name, type, count, show_group, multi_selection,
                                permission_protected, mandatory, allow_custom, description)
        VALUES ('Imported Cohort Metadata', 0, 0, false, true,
                false, false, true,
                'Container for tags recording where an imported cohort came from')
        RETURNING id INTO source_group_id;
        RAISE NOTICE 'Created "Imported Cohort Metadata" tag group (id: %)', source_group_id;
    ELSE
        UPDATE webapi.tag
        SET allow_custom = true, show_group = false, multi_selection = true
        WHERE id = source_group_id
          AND (allow_custom IS NOT TRUE OR show_group IS NOT FALSE
               OR multi_selection IS NOT TRUE);
    END IF;

    -- Group holding the mutually exclusive review-status tags.
    SELECT id INTO status_group_id FROM webapi.tag
    WHERE lower(name) = lower('Cohort Review Status');

    IF status_group_id IS NULL THEN
        INSERT INTO webapi.tag (name, type, count, show_group, multi_selection,
                                permission_protected, mandatory, allow_custom, description)
        VALUES ('Cohort Review Status', 0, 0, false, false,
                false, false, true,
                'Container for the review status of an imported cohort; one applies at a time')
        RETURNING id INTO status_group_id;
        RAISE NOTICE 'Created "Cohort Review Status" tag group (id: %)', status_group_id;
    ELSE
        UPDATE webapi.tag
        SET allow_custom = true, show_group = false, multi_selection = false
        WHERE id = status_group_id
          AND (allow_custom IS NOT TRUE OR show_group IS NOT FALSE
               OR multi_selection IS NOT FALSE);
    END IF;

    -- Move status tags seeded under the source group by an earlier version of
    -- this script; single-selection only takes effect once they live in the
    -- status group.
    UPDATE webapi.tag_group
    SET group_id = status_group_id
    WHERE group_id = source_group_id
      AND tag_id IN (SELECT id FROM webapi.tag WHERE lower(name) <> lower('Phenotype Library'));
END $$;

SELECT g.name AS tag_group, g.multi_selection, count(tg.tag_id) AS members
FROM webapi.tag g
LEFT JOIN webapi.tag_group tg ON tg.group_id = g.id
WHERE g.name IN ('Imported Cohort Metadata', 'Cohort Review Status')
GROUP BY g.name, g.multi_selection ORDER BY g.name;
