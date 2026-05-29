export type PosterWithCandidate = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  candidate: {
    photo_url: string | null;
    profile: {
      full_name: string;
    };
    position: {
      name: string;
    };
  };
};