# Function Trim

## Setup

### Requirements

The following environment variables can be set:

```text
AWS_REGION=<your-aws-region> (optional can also be provided in payload)
AWS_ACCESS_KEY_ID=<your-aws-access-key-id> (optional, only needed when uploading to S3)
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key> (optional, only needed when uploading to S3)
```

Using an `.env` file is supported. Just rename `.env.example` to `.env` and insert your values.

### FFmpeg

FFmpeg is required to convert the input file/url to a file that can be uploaded to S3. You can download it from [here](https://www.ffmpeg.org/download.html).

## Installation / Usage

Starting the service is as simple as running:

```bash
npm install
npm start
```

A docker image and docker-compose are also available:

```bash
docker-compose up --build -d
```

The trim service is now up and running and available on port `8000`.

### Endpoints

Available endpoints are:

| Endpoint      | Method   | Description                                     |
| ------------- | -------- | ----------------------------------------------- |
| `/`           | `GET`    | Heartbeat endpoint of service                   |
| `/trim`       | `POST`   | Create a new trim job. Provide settings in body |
| `/trim/jobId` | `GET`    | Get the status of a trim job                    |
| `/trim/jobId` | `DELETE` | Cancel a trim job                               |

### Examples

Request body to trim a bundle of ABR files available on an S3 bucket and upload the result to an S3 bucket.

```json
{
  "source": [
    "s3://lab-testcontent-store/oscdemo/demo/240.mp4",
    "s3://lab-testcontent-store/oscdemo/demo/360.mp4",
    "s3://lab-testcontent-store/oscdemo/demo/480.mp4",
    "s3://lab-testcontent-store/oscdemo/demo/720.mp4",
    "s3://lab-testcontent-store/oscdemo/demo/1080.mp4"
  ],
  "sourceType": "abr",
  "outputDirectory": "s3://lab-testcontent-store/oscdemo",
  "edl": {
    "name": "reel-demo1",
    "segments": [
      {
        "start": 10,
        "end": 20
      }
    ]
  }
}
```

Request body for a single file:

```json
{
  "source": ["s3://lab-testcontent-store/oscdemo/demo/1080.mp4"],
  "sourceType": "single",
  "outputDirectory": "s3://lab-testcontent-store/oscdemo",
  "edl": {
    "name": "reel-demo2",
    "segments": [
      {
        "start": 10,
        "end": 20
      }
    ]
  }
}
```

### Contributing

See [CONTRIBUTING](CONTRIBUTING.md)

# Support

Join our [community on Slack](http://slack.streamingtech.se) where you can post any questions regarding any of our open source projects. Eyevinn's consulting business can also offer you:

- Further development of this component
- Customization and integration of this component into your platform
- Support and maintenance agreement

Contact [sales@eyevinn.se](mailto:sales@eyevinn.se) if you are interested.

# About Eyevinn Technology

[Eyevinn Technology](https://www.eyevinntechnology.se) is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor. As our way to innovate and push the industry forward we develop proof-of-concepts and tools. The things we learn and the code we write we share with the industry in [blogs](https://dev.to/video) and by open sourcing the code we have written.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!
