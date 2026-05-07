type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
  json: (data: unknown) => void;
};

export default function handler(_request: unknown, response: ApiResponse) {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    ok: true,
    service: "sorteador-vercel",
    timestamp: new Date().toISOString()
  });
}
