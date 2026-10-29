delete from reviews where counselor_id like 'sample-%';
delete from appointments where counselor_id like 'sample-%' or member_id = 'sample-member';
delete from counselor_profiles where user_id like 'sample-%';
